import type { Request, Response } from 'express';
import { paginationSchema } from '@oherb-tracker/validation';
import {
  getNotificationPreferences, listNotifications, markAllNotificationsRead, markNotificationRead,
  unreadNotificationCount, updateNotificationPreferences,
} from '../services/notification.service.js';

export async function listNotificationsController(request: Request, response: Response) {
  const parsed = paginationSchema.safeParse(request.query);
  if (!parsed.success) return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid pagination.' } });
  return response.json({ success: true, data: await listNotifications(request.user!.id, parsed.data.page, parsed.data.limit) });
}
export async function unreadCountController(request: Request, response: Response) {
  return response.json({ success: true, data: { unreadCount: await unreadNotificationCount(request.user!.id) } });
}
export async function markReadController(request: Request, response: Response) {
  const notification = await markNotificationRead(request.user!.id, String(request.params.id));
  if (!notification) return response.status(404).json({ success: false, error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' } });
  return response.json({ success: true, data: { notification } });
}
export async function markAllReadController(request: Request, response: Response) {
  return response.json({ success: true, data: await markAllNotificationsRead(request.user!.id) });
}
export async function getPreferencesController(request: Request, response: Response) {
  return response.json({ success: true, data: { preferences: await getNotificationPreferences(request.user!.id) } });
}
export async function updatePreferencesController(request: Request, response: Response) {
  const body = request.body as {
    shipmentStatus?: unknown;
    inApp?: { shipmentStatus?: unknown };
    email?: { shipmentStatus?: unknown };
    sms?: { shipmentStatus?: unknown };
  };
  const legacy = typeof body.shipmentStatus === 'boolean' ? body.shipmentStatus : undefined;
  const inApp = typeof body.inApp?.shipmentStatus === 'boolean' ? body.inApp.shipmentStatus : legacy;
  const email = typeof body.email?.shipmentStatus === 'boolean' ? body.email.shipmentStatus : undefined;
  const sms = typeof body.sms?.shipmentStatus === 'boolean' ? body.sms.shipmentStatus : undefined;
  if (inApp === undefined && email === undefined && sms === undefined) {
    return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one preference must be a boolean.' } });
  }
  return response.json({
    success: true,
    data: { preferences: await updateNotificationPreferences(request.user!.id, { inAppShipmentStatus: inApp, emailShipmentStatus: email, smsShipmentStatus: sms }) },
  });
}
