import type { PublicTrackingResult } from '../components/tracking/tracking-types';
import type { AnalyticsOverview, AnalyticsRangeKey, OperationalReportPreview, OperationalReportType } from '@oherb-tracker/shared-types';

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type AuthRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
  name?: string;
};

export type CustomerOption = {
  id: string;
  name: string;
  email: string;
  externalCustomerId?: string | null;
};

export type ShipmentStatus =
  | 'CREATED'
  | 'LABEL_CREATED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'AT_ORIGIN_FACILITY'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_FACILITY'
  | 'DEPARTED_FACILITY'
  | 'AT_DESTINATION_FACILITY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_ATTEMPTED'
  | 'EXCEPTION'
  | 'CANCELLED'
  | 'RETURNED';

export type ServiceType = 'STANDARD' | 'EXPRESS' | 'OVERNIGHT';

export type Address = {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type ShipmentAddressInput = {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

export type CreateShipmentInput = {
  customerId: string;
  serviceType: ServiceType;
  origin: ShipmentAddressInput;
  destination: ShipmentAddressInput;
  weight?: number;
  description?: string;
  estimatedDelivery?: string;
};

export type UpdateShipmentInput = {
  serviceType?: ServiceType;
  origin?: ShipmentAddressInput;
  destination?: ShipmentAddressInput;
  estimatedDelivery?: string | null;
  weight?: number | null;
  description?: string | null;
  currentLocation?: {
    name: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  } | null;
};

export type Shipment = {
  id: string;
  shipmentNumber?: string | null;
  trackingNumber: string;
  externalOrderId?: string | null;
  externalCustomerId?: string | null;
  externalSellerId?: string | null;
  status: ShipmentStatus;
  serviceType: ServiceType | string;
  origin?: Address | null;
  destination?: Address | null;
  estimatedDelivery?: Date | string | null;
  actualDelivery?: Date | string | null;
  weight?: number | null;
  description?: string | null;
  currentLocation?: { name?: string; city?: string; country?: string; latitude?: number; longitude?: number } | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  customer?: { id?: string; name?: string; email?: string; role?: string } | null;
  trackingEvents?: Array<Record<string, unknown>>;
};

export type ShipmentPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ShipmentListResponse = {
  shipments: Shipment[];
  pagination: ShipmentPagination;
};

export type ShipmentListQuery = {
  search?: string;
  status?: string;
  serviceType?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
};

export type ShipmentDetailResponse = {
  shipment: Shipment;
};

export type TrackingEvent = {
  id?: string;
  status: ShipmentStatus;
  description?: string;
  location?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: Date | string | null;
};

export type TrackingEventInput = {
  status: ShipmentStatus;
  description: string;
  location: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
};

export type ShipmentEventsResponse = {
  shipmentId: string;
  trackingNumber: string;
  events: TrackingEvent[];
};
export type Notification = {
  id: string; type: string; title: string; message: string;
  shipmentId?: string; trackingNumber?: string; isRead: boolean;
  delivery?: {
    email?: { status: string; sentAt?: string; failedAt?: string; errorCode?: string };
    sms?: { status: string; sentAt?: string; failedAt?: string; errorCode?: string };
  };
  readAt?: string | null; createdAt: string; updatedAt: string;
};
export type NotificationListResponse = { notifications: Notification[]; pagination: ShipmentPagination };
export type NotificationPreferences = {
  inApp: { shipmentStatus: boolean };
  email: { shipmentStatus: boolean };
  sms: { shipmentStatus: boolean };
};
export type NotificationPreferenceUpdate = {
  inApp?: { shipmentStatus: boolean };
  email?: { shipmentStatus: boolean };
  sms?: { shipmentStatus: boolean };
};

export type { AnalyticsOverview, AnalyticsRangeKey };

export type AnalyticsQuery = {
  range: AnalyticsRangeKey;
  from?: string;
  to?: string;
};

export type ReportQuery = {
  reportType: OperationalReportType;
  from?: string;
  to?: string;
  status?: ShipmentStatus;
  serviceType?: ServiceType;
  search?: string;
  page?: number;
  limit?: number;
};

const API_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333')
  : (process.env.NEXT_PUBLIC_API_URL ?? '');

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new ApiError(payload.error?.message ?? 'Request failed', response.status, payload.error?.code, payload.error?.details);
  }

  return (payload.data ?? ({} as T)) as T;
}

export async function registerUser(input: { name: string; email: string; password: string; phone?: string }) {
  return apiRequest<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginUser(input: { email: string; password: string }) {
  return apiRequest<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutUser() {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return apiRequest<{ user: AuthUser }>('/api/auth/me', {
    method: 'GET',
  });
}

export async function getAnalyticsOverview(query: AnalyticsQuery): Promise<AnalyticsOverview> {
  const params = new URLSearchParams({ range: query.range });
  if (query.range === 'custom' && query.from && query.to) {
    params.set('from', query.from);
    params.set('to', query.to);
  }
  return apiRequest<AnalyticsOverview>(`/api/admin/analytics/overview?${params.toString()}`, { method: 'GET' });
}

function reportQueryParams(query: ReportQuery) {
  const params = new URLSearchParams({ reportType: query.reportType });
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.status) params.set('status', query.status);
  if (query.serviceType) params.set('serviceType', query.serviceType);
  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  return params;
}

export async function getReportPreview(query: ReportQuery): Promise<OperationalReportPreview> {
  return apiRequest<OperationalReportPreview>(`/api/admin/reports/preview?${reportQueryParams(query).toString()}`, { method: 'GET' });
}

export async function downloadReportCsv(query: ReportQuery): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/reports/export?${reportQueryParams(query).toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    let message = 'Unable to export report.';
    try {
      const payload = (await response.json()) as ApiEnvelope<never>;
      message = payload.error?.message ?? message;
    } catch {
      // Keep the safe generic message when the server does not return JSON.
    }
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `oherb-${query.reportType}-report.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function normalizeTrackingNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidTrackingNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 4 || trimmed.length > 40) return false;
  return /^[A-Z0-9-]+$/.test(trimmed);
}

export async function getPublicTracking(trackingNumber: string): Promise<PublicTrackingResult> {
  const normalized = normalizeTrackingNumber(trackingNumber);
  return apiRequest<PublicTrackingResult>(`/api/v1/shipments/track/${encodeURIComponent(normalized)}`, {
    method: 'GET',
  });
}

export async function listShipments(query?: { page?: number; limit?: number; search?: string; status?: string; serviceType?: string; sortBy?: string; sortOrder?: string }) {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.search) params.set('search', query.search);
  if (query?.status) params.set('status', query.status);
  if (query?.serviceType) params.set('serviceType', query.serviceType);
  if (query?.sortBy) params.set('sortBy', query.sortBy);
  if (query?.sortOrder) params.set('sortOrder', query.sortOrder);
  const suffix = params.size ? `?${params.toString()}` : '';
  return apiRequest<ShipmentListResponse>(`/api/shipments${suffix}`, { method: 'GET' });
}

export async function listCustomers(search?: string) {
  const params = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest<{ customers: CustomerOption[] }>(`/api/shipments/customers${params}`, { method: 'GET' });
}

export async function getShipmentById(id: string) {
  return apiRequest<ShipmentDetailResponse>(`/api/shipments/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function getShipmentEvents(id: string) {
  return apiRequest<ShipmentEventsResponse>(`/api/shipments/${encodeURIComponent(id)}/events`, { method: 'GET' });
}

export async function createShipment(input: CreateShipmentInput) {
  return apiRequest<ShipmentDetailResponse>('/api/shipments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateShipment(id: string, input: UpdateShipmentInput) {
  return apiRequest<ShipmentDetailResponse>(`/api/shipments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteShipment(id: string) {
  return apiRequest<{ deleted: boolean }>(`/api/shipments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function updateShipmentStatus(id: string, input: TrackingEventInput) {
  return apiRequest<ShipmentEventsResponse>(`/api/shipments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function createTrackingEvent(id: string, input: TrackingEventInput) {
  return apiRequest<ShipmentEventsResponse>(`/api/shipments/${encodeURIComponent(id)}/events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listNotifications(page = 1, limit = 20) {
  return apiRequest<NotificationListResponse>(`/api/notifications?page=${page}&limit=${limit}`, { method: 'GET' });
}
export async function getUnreadNotificationCount() {
  return apiRequest<{ unreadCount: number }>('/api/notifications/unread-count', { method: 'GET' });
}
export async function markNotificationRead(id: string) {
  return apiRequest<{ notification: Notification }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}
export async function markAllNotificationsRead() {
  return apiRequest<{ updated: number }>('/api/notifications/read-all', { method: 'PATCH' });
}
export async function getNotificationPreferences() {
  return apiRequest<{ preferences: NotificationPreferences }>('/api/notifications/preferences', { method: 'GET' });
}
export async function updateNotificationPreferences(preferences: NotificationPreferenceUpdate) {
  return apiRequest<{ preferences: NotificationPreferences }>('/api/notifications/preferences', {
    method: 'PATCH', body: JSON.stringify(preferences),
  });
}
