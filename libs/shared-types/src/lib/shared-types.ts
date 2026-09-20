export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum ShipmentStatus {
  CREATED = 'CREATED',
  LABEL_CREATED = 'LABEL_CREATED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  PICKED_UP = 'PICKED_UP',
  AT_ORIGIN_FACILITY = 'AT_ORIGIN_FACILITY',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED_AT_FACILITY = 'ARRIVED_AT_FACILITY',
  DEPARTED_FACILITY = 'DEPARTED_FACILITY',
  AT_DESTINATION_FACILITY = 'AT_DESTINATION_FACILITY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  DELIVERY_ATTEMPTED = 'DELIVERY_ATTEMPTED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum ServiceType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  OVERNIGHT = 'OVERNIGHT',
}

export enum PackageWeightUnit {
  KG = 'KG',
  LB = 'LB',
}

export enum PackageDimensionUnit {
  CM = 'CM',
  IN = 'IN',
}

export enum PackageType {
  BOX = 'BOX',
  ENVELOPE = 'ENVELOPE',
  PALLET = 'PALLET',
  OTHER = 'OTHER',
}

export type PackageDimensions = {
  length: number;
  width: number;
  height: number;
};

export type ShipmentPackage = {
  id: string;
  shipmentId: string;
  packageNumber: string;
  trackingNumber: string;
  weight: number;
  weightUnit: PackageWeightUnit;
  dimensions: PackageDimensions;
  dimensionUnit: PackageDimensionUnit;
  packageType?: PackageType;
  description?: string;
  status: ShipmentStatus;
  createdAt?: string;
  updatedAt?: string;
};

export enum OperationalReportType {
  SHIPMENT = 'shipment',
  DELIVERY_PERFORMANCE = 'delivery-performance',
  EXCEPTION = 'exception',
}
export const ReportType = OperationalReportType;
export type ReportType = OperationalReportType;

export enum NotificationType {
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_PICKED_UP = 'SHIPMENT_PICKED_UP',
  SHIPMENT_IN_TRANSIT = 'SHIPMENT_IN_TRANSIT',
  SHIPMENT_ARRIVED_AT_FACILITY = 'SHIPMENT_ARRIVED_AT_FACILITY',
  SHIPMENT_DEPARTED_FACILITY = 'SHIPMENT_DEPARTED_FACILITY',
  SHIPMENT_OUT_FOR_DELIVERY = 'SHIPMENT_OUT_FOR_DELIVERY',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  SHIPMENT_EXCEPTION = 'SHIPMENT_EXCEPTION',
  SHIPMENT_CANCELLED = 'SHIPMENT_CANCELLED',
  SHIPMENT_RETURNED = 'SHIPMENT_RETURNED',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export type AnalyticsRangeKey = '7d' | '30d' | '90d' | 'custom';

export type AnalyticsDateRange = {
  key: AnalyticsRangeKey;
  from: string;
  to: string;
  days: number;
};

export type AnalyticsStatusMetric = {
  status: ShipmentStatus;
  count: number;
};

export type AnalyticsServiceMetric = {
  serviceType: ServiceType;
  count: number;
};

export type AnalyticsTrendMetric = {
  date: string;
  shipmentsCreated: number;
  trackingEvents: number;
  deliveries: number;
};

export type AnalyticsOverviewMetric = {
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  completedShipments: number;
  inTransitShipments: number;
  outForDeliveryShipments: number;
  exceptionShipments: number;
  cancelledShipments: number;
  deliveryRate: number;
  onTimeDeliveryRate: number;
};

export type AnalyticsDeliveryPerformance = {
  deliveredShipments: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  pendingDeliveryEstimate: number;
  avgDeliveryDays: number | null;
  avgDelayDays: number | null;
};

export type AnalyticsOverview = {
  range: AnalyticsDateRange;
  overview: AnalyticsOverviewMetric;
  statusBreakdown: AnalyticsStatusMetric[];
  serviceBreakdown: AnalyticsServiceMetric[];
  trends: AnalyticsTrendMetric[];
  deliveryPerformance: AnalyticsDeliveryPerformance;
};

export type OperationalReportFilters = {
  reportType: OperationalReportType;
  from?: string;
  to?: string;
  status?: ShipmentStatus;
  serviceType?: ServiceType;
  search?: string;
  page: number;
  limit: number;
};
export type ReportFilters = OperationalReportFilters;

export type ShipmentReportRow = {
  trackingNumber: string;
  status: ShipmentStatus;
  serviceType: ServiceType;
  createdAt: string;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
};

export type DeliveryPerformanceReportRow = ShipmentReportRow & {
  deliveryDays: number | null;
  delayDays: number | null;
  onTime: boolean | null;
};

export type ExceptionReportRow = ShipmentReportRow & {
  updatedAt: string;
};

export type OperationalReportRow =
  | ShipmentReportRow
  | DeliveryPerformanceReportRow
  | ExceptionReportRow;

export type OperationalReportPreview = {
  reportType: OperationalReportType;
  filters: OperationalReportFilters;
  generatedAt: string;
  rows: OperationalReportRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
export type ReportPreview = OperationalReportPreview;
