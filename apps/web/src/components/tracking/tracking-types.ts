import type { ShipmentStatus, ServiceType } from '@oherb-tracker/shared-types';

export type PublicTrackingEvent = {
  status: ShipmentStatus | string;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string;
};

export type PublicTrackingAddress = {
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

export type PublicTrackingLocation = {
  name?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type PublicTrackingResult = {
  trackingNumber: string;
  status: ShipmentStatus | string;
  serviceType: ServiceType | string;
  estimatedDelivery?: string | null;
  actualDelivery?: string | null;
  currentLocation?: string | PublicTrackingLocation | null;
  origin?: PublicTrackingAddress | null;
  destination?: PublicTrackingAddress | null;
  events: PublicTrackingEvent[];
};
