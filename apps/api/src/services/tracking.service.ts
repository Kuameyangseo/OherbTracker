import mongoose from 'mongoose';
import { Package, Shipment, TrackingEvent } from '@oherb-tracker/database';
import type {
  ShipmentDocument,
  TrackingEventDocument,
} from '@oherb-tracker/database';
import { ShipmentStatus } from '@oherb-tracker/shared-types';
import type {
  ShipmentStatusUpdateInput,
  TrackingEventInput,
} from '@oherb-tracker/validation';
import { assertValidShipmentStatusTransition } from './shipment-status.js';
import { getShipmentById, ShipmentError } from './shipment.service.js';
import {
  publishShipmentStatusChanged,
  publishTrackingEvent,
  shipmentRealtimeSnapshot,
} from '../socket/socket.publisher.js';
import { createShipmentNotification } from './notification.service.js';

type RequestUser = {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'SELLER' | 'STAFF' | 'ADMIN';
};
type TrackingInput = TrackingEventInput;

type PopulatedShipment = ShipmentDocument & {
  originAddress?: { name?: string; phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  destinationAddress?: { name?: string; phone?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; postalCode?: string; country?: string };
  trackingEvents?: TrackingEventDocument[];
};

function isObjectId(value: string): boolean {
  return mongoose.isValidObjectId(value);
}

function normalizeTrackingNumber(value: string): string {
  return value.trim().toUpperCase();
}

function shipmentId(shipment: ShipmentDocument): string {
  return String((shipment as unknown as { _id: unknown })._id);
}

function eventId(event: TrackingEventDocument): string {
  return String((event as unknown as { _id: unknown })._id);
}

function eventResponse(event: TrackingEventDocument | Record<string, unknown>) {
  const value = event as TrackingEventDocument & { _id?: unknown };
  return {
    id: value._id ? String(value._id) : undefined,
    packageId: value.packageId ? String(value.packageId) : undefined,
    trackingNumber: value.trackingNumber ?? undefined,
    status: value.status,
    description: value.description,
    location: value.location,
    city: value.city,
    country: value.country,
    latitude: value.latitude ?? null,
    longitude: value.longitude ?? null,
    timestamp: value.timestamp,
  };
}

function publicAddress(address?: PopulatedShipment['originAddress']) {
  if (!address) return null;
  return {
    name: address.name,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? null,
    city: address.city,
    state: address.state ?? null,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function locationFromInput(input: TrackingInput, shipment: ShipmentDocument) {
  const current = shipment.currentLocation as
    | {
        name?: string;
        city?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
      }
    | undefined;
  const hasLocation =
    input.location ||
    input.city ||
    input.country ||
    input.latitude !== undefined ||
    input.longitude !== undefined;

  if (!hasLocation) return undefined;

  return {
    name: input.location || current?.name || 'Unknown location',
    city: input.city || current?.city || 'Unknown city',
    country: input.country || current?.country || 'Unknown country',
    ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
  };
}

function eventLocation(input: TrackingInput, shipment: ShipmentDocument) {
  const current = shipment.currentLocation as
    | { name?: string; city?: string; country?: string }
    | undefined;
  return {
    location: input.location || current?.name || 'Unknown location',
    city: input.city || current?.city || 'Unknown city',
    country: input.country || current?.country || 'Unknown country',
  };
}

async function findShipmentForUser(
  id: string,
  user: RequestUser,
  session?: mongoose.ClientSession,
) {
  if (!isObjectId(id)) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  const filter: Record<string, unknown> = { _id: id };
  if (user.role === 'CUSTOMER') filter.customerId = user.id;
  if (user.role === 'SELLER') filter.sellerId = user.id;

  const query = Shipment.findOne(filter);
  if (session) query.session(session);
  const shipment = await query;
  if (!shipment) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }
  return shipment;
}

export async function getPublicTracking(trackingNumber: string) {
  const normalized = normalizeTrackingNumber(trackingNumber);
  const shipment = (await Shipment.findOne({ trackingNumber: normalized })
    .populate({ path: 'originAddress', select: 'name phone addressLine1 addressLine2 city state postalCode country -_id' })
    .populate({ path: 'destinationAddress', select: 'name phone addressLine1 addressLine2 city state postalCode country -_id' })
    .populate({
      path: 'trackingEvents',
      options: { sort: { timestamp: 1 } },
      select:
        'status description location city country latitude longitude timestamp -_id',
    })
    .lean()) as unknown as PopulatedShipment | null;

  if (!shipment) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  return {
    trackingNumber: shipment.trackingNumber,
    status: shipment.status,
    serviceType: shipment.serviceType,
    estimatedDelivery: shipment.estimatedDelivery ?? null,
    actualDelivery: shipment.actualDelivery ?? null,
    currentLocation: shipment.currentLocation ?? null,
    origin: publicAddress(shipment.originAddress),
    destination: publicAddress(shipment.destinationAddress),
    events: (shipment.trackingEvents ?? []).map(eventResponse),
  };
}

export async function getShipmentEvents(id: string, user: RequestUser) {
  const shipment = await findShipmentForUser(id, user);
  const events = (await TrackingEvent.find({ shipmentId: shipmentId(shipment) })
    .sort({ timestamp: 1 })
    .lean()) as unknown as TrackingEventDocument[];

  return {
    shipmentId: shipmentId(shipment),
    trackingNumber: shipment.trackingNumber,
    events: events.map(eventResponse),
  };
}

async function applyTrackingEvent(
  id: string,
  input: TrackingInput,
  user: RequestUser,
) {
  const session = await mongoose.startSession();
  let updatedShipmentId = id;

  try {
    await session.withTransaction(async () => {
      const shipment = await findShipmentForUser(id, user, session);
      const nextStatus = input.status as ShipmentStatus;
      const currentStatus = shipment.status as ShipmentStatus;

      if (nextStatus !== currentStatus) {
        try {
          assertValidShipmentStatusTransition(currentStatus, nextStatus);
        } catch (error) {
          throw new ShipmentError(
            400,
            'INVALID_STATUS_TRANSITION',
            error instanceof Error
              ? error.message
              : 'Invalid status transition.',
          );
        }
        shipment.status = nextStatus;
      }

      const location = locationFromInput(input, shipment);
      if (location) shipment.currentLocation = location;
      if (nextStatus === ShipmentStatus.DELIVERED)
        shipment.actualDelivery = new Date();

      await shipment.save({ session });

      let packageReference: {
        packageId?: mongoose.Types.ObjectId;
        trackingNumber?: string;
      } = {};
      if (input.packageId) {
        if (!isObjectId(input.packageId)) {
          throw new ShipmentError(
            400,
            'INVALID_PACKAGE',
            'Invalid package id.',
          );
        }

        const packageDocument = await Package.findOne({
          _id: input.packageId,
          shipmentId: shipment._id,
        })
          .session(session)
          .lean();
        if (!packageDocument) {
          throw new ShipmentError(
            400,
            'INVALID_PACKAGE',
            'Package does not belong to this shipment.',
          );
        }

        packageReference = {
          packageId: packageDocument._id,
          trackingNumber: packageDocument.trackingNumber,
        };
      }

      const eventLocationData = eventLocation(input, shipment);
      const event = new TrackingEvent({
        shipmentId: shipmentId(shipment),
        ...packageReference,
        status: nextStatus,
        description:
          input.description ||
          `Shipment status updated to ${nextStatus.replaceAll('_', ' ').toLowerCase()}.`,
        ...eventLocationData,
        latitude: input.latitude,
        longitude: input.longitude,
        timestamp: input.timestamp ?? new Date(),
      });
      await event.save({ session });
      updatedShipmentId = shipmentId(shipment);
    });
  } finally {
    await session.endSession();
  }

  const data = await getShipmentEvents(updatedShipmentId, user);
  const shipment = await getShipmentById(updatedShipmentId, {
    id: user.id,
    email: user.email,
    role: user.role,
  });
  const latestEvent = data.events.at(-1);
  publishShipmentStatusChanged(shipmentRealtimeSnapshot(shipment));
  if (latestEvent)
    publishTrackingEvent({ shipmentId: updatedShipmentId, event: latestEvent });
  if (latestEvent && latestEvent.status !== data.events.at(-2)?.status) {
    await createShipmentNotification(
      updatedShipmentId,
      latestEvent.status as ShipmentStatus,
    );
  }
  return data;
}

export async function createTrackingEvent(
  id: string,
  input: TrackingEventInput,
  user: RequestUser,
) {
  return applyTrackingEvent(id, input, user);
}

export async function updateShipmentStatus(
  id: string,
  input: ShipmentStatusUpdateInput,
  user: RequestUser,
) {
  return applyTrackingEvent(id, input, user);
}

export async function updateShipmentStatusByExternalOrder(
  externalOrderId: string,
  input: ShipmentStatusUpdateInput,
) {
  const shipment = await Shipment.findOne({ externalOrderId }).select('_id').lean();
  if (!shipment) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Tracker shipment not found.');
  }

  return applyTrackingEvent(String(shipment._id), input, {
    id: '',
    email: '',
    role: 'ADMIN',
  });
}

export { normalizeTrackingNumber, eventId };
