import mongoose from 'mongoose';
import {
  Notification,
  Shipment,
  User,
  type NotificationDocument,
} from '@oherb-tracker/database';
import { NotificationType, ShipmentStatus } from '@oherb-tracker/shared-types';
import { publishNotificationNew } from '../socket/socket.publisher.js';
import { dispatchShipmentNotification } from '../notifications/dispatcher.js';

const statusTypes: Partial<Record<ShipmentStatus, NotificationType>> = {
  [ShipmentStatus.CREATED]: NotificationType.SHIPMENT_CREATED,
  [ShipmentStatus.PICKED_UP]: NotificationType.SHIPMENT_PICKED_UP,
  [ShipmentStatus.IN_TRANSIT]: NotificationType.SHIPMENT_IN_TRANSIT,
  [ShipmentStatus.ARRIVED_AT_FACILITY]:
    NotificationType.SHIPMENT_ARRIVED_AT_FACILITY,
  [ShipmentStatus.DEPARTED_FACILITY]:
    NotificationType.SHIPMENT_DEPARTED_FACILITY,
  [ShipmentStatus.OUT_FOR_DELIVERY]: NotificationType.SHIPMENT_OUT_FOR_DELIVERY,
  [ShipmentStatus.DELIVERED]: NotificationType.SHIPMENT_DELIVERED,
  [ShipmentStatus.EXCEPTION]: NotificationType.SHIPMENT_EXCEPTION,
  [ShipmentStatus.CANCELLED]: NotificationType.SHIPMENT_CANCELLED,
  [ShipmentStatus.RETURNED]: NotificationType.SHIPMENT_RETURNED,
};

const labels: Record<string, string> = {
  SHIPMENT_CREATED: 'Shipment created',
  SHIPMENT_PICKED_UP: 'Shipment picked up',
  SHIPMENT_IN_TRANSIT: 'Shipment in transit',
  SHIPMENT_ARRIVED_AT_FACILITY: 'Shipment arrived at facility',
  SHIPMENT_DEPARTED_FACILITY: 'Shipment departed facility',
  SHIPMENT_OUT_FOR_DELIVERY: 'Shipment out for delivery',
  SHIPMENT_DELIVERED: 'Shipment delivered',
  SHIPMENT_EXCEPTION: 'Shipment exception',
  SHIPMENT_CANCELLED: 'Shipment cancelled',
  SHIPMENT_RETURNED: 'Shipment returned',
};

export function notificationTypeForStatus(
  status: ShipmentStatus,
): NotificationType | undefined {
  return statusTypes[status];
}

export function notificationTitle(type: NotificationType): string {
  return labels[type] ?? 'Shipment update';
}

export type SafeNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  shipmentId?: string;
  trackingNumber?: string;
  metadata?: unknown;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  delivery?: unknown;
};

type NotificationRecord = Pick<
  NotificationDocument,
  | 'type'
  | 'title'
  | 'message'
  | 'shipmentId'
  | 'trackingNumber'
  | 'metadata'
  | 'delivery'
  | 'isRead'
  | 'readAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  _id?: unknown;
  id?: unknown;
};

function safeNotification(value: NotificationRecord): SafeNotification {
  return {
    id: String(value._id ?? value.id),
    type: value.type,
    title: value.title,
    message: value.message,
    ...(value.shipmentId ? { shipmentId: String(value.shipmentId) } : {}),
    ...(value.trackingNumber ? { trackingNumber: value.trackingNumber } : {}),
    ...(value.metadata ? { metadata: value.metadata } : {}),
    isRead: Boolean(value.isRead),
    readAt: value.readAt ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(value.delivery ? { delivery: value.delivery } : {}),
  };
}

export async function createShipmentNotification(
  shipmentId: string,
  status: ShipmentStatus,
) {
  const type = notificationTypeForStatus(status);
  if (!type || !mongoose.isValidObjectId(shipmentId)) return null;
  const shipment = await Shipment.findById(shipmentId)
    .select('customerId trackingNumber status currentLocation')
    .lean();
  if (!shipment || !shipment.customerId) return null;
  const preferences = await User.findById(shipment.customerId)
    .select('notificationPreferences')
    .lean();
  const inAppEnabled = isShipmentStatusNotificationsEnabled(preferences);
  const title = notificationTitle(type);
  const readable = status.replaceAll('_', ' ').toLowerCase();
  const notification = await Notification.create({
    userId: shipment.customerId,
    type,
    title,
    message: `Your shipment ${shipment.trackingNumber} is ${readable}.`,
    shipmentId,
    trackingNumber: shipment.trackingNumber,
  });
  const safe = safeNotification(notification.toObject());
  if (inAppEnabled) publishNotificationNew(String(shipment.customerId), safe);
  void dispatchShipmentNotification({
    notificationId: safe.id,
    userId: String(shipment.customerId),
    title,
    message: notification.message,
    trackingNumber: shipment.trackingNumber,
    status,
    location: shipment.currentLocation?.city,
  }).catch((error: unknown) => {
    console.error('[notification] delivery dispatch failed', {
      notificationId: safe.id,
      shipmentId,
      errorCode: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
    });
  });
  return safe;
}

export async function listNotifications(
  userId: string,
  page: number,
  limit: number,
) {
  const filter = { userId };
  const [total, notifications] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);
  return {
    notifications: notifications.map(safeNotification),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function unreadNotificationCount(userId: string) {
  return Notification.countDocuments({ userId, isRead: false });
}

export async function markNotificationRead(userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  ).lean();
  return notification ? safeNotification(notification) : null;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );
  return { updated: result.modifiedCount };
}

export async function getNotificationPreferences(userId: string) {
  const user = await User.findById(userId)
    .select('notificationPreferences')
    .lean();
  return {
    inApp: {
      shipmentStatus: preferenceValue(user, 'inApp', 'shipmentStatus', true),
    },
    email: {
      shipmentStatus: preferenceValue(user, 'email', 'shipmentStatus', true),
    },
    sms: {
      shipmentStatus: preferenceValue(user, 'sms', 'shipmentStatus', false),
    },
  };
}

export type NotificationPreferenceUpdate = {
  inAppShipmentStatus?: boolean;
  emailShipmentStatus?: boolean;
  smsShipmentStatus?: boolean;
};

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferenceUpdate,
) {
  const updates: Record<string, boolean> = {};
  if (input.inAppShipmentStatus !== undefined)
    updates['notificationPreferences.inApp.shipmentStatus'] =
      input.inAppShipmentStatus;
  if (input.emailShipmentStatus !== undefined)
    updates['notificationPreferences.email.shipmentStatus'] =
      input.emailShipmentStatus;
  if (input.smsShipmentStatus !== undefined)
    updates['notificationPreferences.sms.shipmentStatus'] =
      input.smsShipmentStatus;
  if (Object.keys(updates).length)
    await User.findByIdAndUpdate(userId, { $set: updates });
  return getNotificationPreferences(userId);
}

function isShipmentStatusNotificationsEnabled(value: unknown): boolean {
  return preferenceValue(value, 'inApp', 'shipmentStatus', true);
}

function preferenceValue(
  value: unknown,
  channel: 'inApp' | 'email' | 'sms',
  key: 'shipmentStatus',
  fallback: boolean,
): boolean {
  if (!value || typeof value !== 'object') return fallback;
  const preferences = Reflect.get(value, 'notificationPreferences');
  if (!preferences || typeof preferences !== 'object') return fallback;
  const channelValue = Reflect.get(preferences, channel);
  if (!channelValue || typeof channelValue !== 'object') return fallback;
  return Reflect.get(channelValue, key) !== false;
}
