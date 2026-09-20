export const socketEvents = {
  joinShipment: 'shipment:join',
  leaveShipment: 'shipment:leave',
  shipmentUpdated: 'shipment:updated',
  shipmentStatusChanged: 'shipment:status_changed',
  trackingEventCreated: 'tracking:event_created',
  notificationNew: 'notification:new',
} as const;

export const shipmentRoom = (shipmentId: string) => `shipment:${shipmentId}`;
export const userRoom = (userId: string) => `user:${userId}`;

export type ShipmentRealtimeSnapshot = {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  currentLocation?: unknown;
  estimatedDelivery?: Date | string | null;
  actualDelivery?: Date | string | null;
  updatedAt?: Date | string | null;
};

export type TrackingRealtimeEvent = {
  shipmentId: string;
  event: {
    id?: string;
    status: string;
    description?: string;
    location?: string;
    city?: string;
    country?: string;
    latitude?: number | null;
    longitude?: number | null;
    timestamp?: Date | string | null;
  };
};
