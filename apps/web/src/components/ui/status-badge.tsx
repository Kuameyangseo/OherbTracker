import { ShipmentStatus } from '@oherb-tracker/shared-types';

const statusLabels: Record<ShipmentStatus, string> = {
  [ShipmentStatus.CREATED]: 'Created',
  [ShipmentStatus.LABEL_CREATED]: 'Label Created',
  [ShipmentStatus.PICKUP_SCHEDULED]: 'Pickup Scheduled',
  [ShipmentStatus.PICKED_UP]: 'Picked Up',
  [ShipmentStatus.AT_ORIGIN_FACILITY]: 'At Origin Facility',
  [ShipmentStatus.IN_TRANSIT]: 'In Transit',
  [ShipmentStatus.ARRIVED_AT_FACILITY]: 'Arrived at Facility',
  [ShipmentStatus.DEPARTED_FACILITY]: 'Departed Facility',
  [ShipmentStatus.AT_DESTINATION_FACILITY]: 'At Destination Facility',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [ShipmentStatus.DELIVERED]: 'Delivered',
  [ShipmentStatus.DELIVERY_ATTEMPTED]: 'Delivery Attempted',
  [ShipmentStatus.EXCEPTION]: 'Exception',
  [ShipmentStatus.CANCELLED]: 'Cancelled',
  [ShipmentStatus.RETURNED]: 'Returned',
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus | string }) {
  const label = statusLabels[status as ShipmentStatus] ?? String(status).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <span className="shipment-status-badge">{label}</span>;
}
