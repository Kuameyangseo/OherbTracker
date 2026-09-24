import { ShipmentStatus } from '@oherb-tracker/shared-types';

const transitions: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  [ShipmentStatus.CREATED]: [ShipmentStatus.LABEL_CREATED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.LABEL_CREATED]: [ShipmentStatus.PICKUP_SCHEDULED, ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKUP_SCHEDULED]: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
  [ShipmentStatus.PICKED_UP]: [ShipmentStatus.AT_ORIGIN_FACILITY, ShipmentStatus.IN_TRANSIT, ShipmentStatus.EXCEPTION],
  [ShipmentStatus.AT_ORIGIN_FACILITY]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.EXCEPTION],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.ARRIVED_AT_FACILITY,
    ShipmentStatus.AT_DESTINATION_FACILITY,
    ShipmentStatus.EXCEPTION,
    ShipmentStatus.RETURNED,
  ],
  [ShipmentStatus.ARRIVED_AT_FACILITY]: [
    ShipmentStatus.DEPARTED_FACILITY,
    ShipmentStatus.AT_DESTINATION_FACILITY,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.DEPARTED_FACILITY]: [
    ShipmentStatus.ARRIVED_AT_FACILITY,
    ShipmentStatus.AT_DESTINATION_FACILITY,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.EXCEPTION,
  ],
  [ShipmentStatus.AT_DESTINATION_FACILITY]: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.EXCEPTION],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.DELIVERY_ATTEMPTED, ShipmentStatus.EXCEPTION, ShipmentStatus.RETURNED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.DELIVERY_ATTEMPTED]: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.EXCEPTION, ShipmentStatus.RETURNED],
  [ShipmentStatus.EXCEPTION]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.RETURNED]: [],
};

export function canTransitionShipmentStatus(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return transitions[from].includes(to);
}

export function assertValidShipmentStatusTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipmentStatus(from, to)) {
    throw new Error(`Shipment cannot transition from ${from} to ${to}`);
  }
}

export function getShipmentStatusTransitions(status: ShipmentStatus): readonly ShipmentStatus[] {
  return transitions[status];
}
