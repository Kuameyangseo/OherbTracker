import type { Server } from 'socket.io';
import { shipmentRoom, socketEvents, userRoom, type ShipmentRealtimeSnapshot, type TrackingRealtimeEvent } from './socket.events.js';
import type { SafeNotification } from '../services/notification.service.js';

let io: Server | undefined;

function dateValue(value: unknown): Date | string | null | undefined {
  if (value instanceof Date || typeof value === 'string') return value;
  return value == null ? value : undefined;
}

export function shipmentRealtimeSnapshot(shipment: Record<string, unknown>): ShipmentRealtimeSnapshot {
  return {
    shipmentId: String(shipment.id),
    trackingNumber: String(shipment.trackingNumber),
    status: String(shipment.status),
    currentLocation: shipment.currentLocation,
    estimatedDelivery: dateValue(shipment.estimatedDelivery),
    actualDelivery: dateValue(shipment.actualDelivery),
    updatedAt: dateValue(shipment.updatedAt),
  };
}

export function setSocketServer(server: Server) {
  io = server;
}

export function publishShipmentUpdated(shipment: ShipmentRealtimeSnapshot) {
  io?.to(shipmentRoom(shipment.shipmentId)).emit(socketEvents.shipmentUpdated, shipment);
  if (io) console.log('[socket] emitted shipment:updated', { shipmentId: shipment.shipmentId });
}

export function publishShipmentStatusChanged(shipment: ShipmentRealtimeSnapshot) {
  io?.to(shipmentRoom(shipment.shipmentId)).emit(socketEvents.shipmentStatusChanged, shipment);
  if (io) console.log('[socket] emitted shipment:status_changed', { shipmentId: shipment.shipmentId });
}

export function publishTrackingEvent(event: TrackingRealtimeEvent) {
  io?.to(shipmentRoom(event.shipmentId)).emit(socketEvents.trackingEventCreated, event);
  if (io) console.log('[socket] emitted tracking:event_created', { shipmentId: event.shipmentId });
}

export function publishNotificationNew(userId: string, notification: SafeNotification) {
  io?.to(userRoom(userId)).emit(socketEvents.notificationNew, notification);
}
