import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  Address,
  Shipment,
  TrackingEvent,
  User,
  type AddressDocument,
  type ShipmentDocument,
} from '@oherb-tracker/database';
import { ServiceType, ShipmentStatus } from '@oherb-tracker/shared-types';
import type { ShipmentCreateInput, ShipmentQuery, ShipmentUpdateInput } from '@oherb-tracker/validation';
import { publishShipmentUpdated, shipmentRealtimeSnapshot } from '../socket/socket.publisher.js';
import { createShipmentNotification } from './notification.service.js';

export class ShipmentError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ShipmentError';
  }
}

type CreateShipmentInput = ShipmentCreateInput;
type UpdateShipmentInput = ShipmentUpdateInput;
type RequestUser = { id: string; email: string; role: 'CUSTOMER' | 'STAFF' | 'ADMIN' };

type ShipmentWithRelations = ShipmentDocument & {
  customer?: { id?: string; name?: string; email?: string; role?: string };
  originAddress?: AddressDocument;
  destinationAddress?: AddressDocument;
  trackingEvents?: Array<Record<string, unknown>>;
};

const MAX_TRACKING_NUMBER_ATTEMPTS = 5;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000);
}

function isObjectId(value: string): boolean {
  return mongoose.isValidObjectId(value);
}

function toAddressInput(address: CreateShipmentInput['origin'] | NonNullable<UpdateShipmentInput['origin']>) {
  return {
    name: address.name,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || undefined,
    city: address.city,
    state: address.state || undefined,
    postalCode: address.postalCode,
    country: address.country,
    ...(address.latitude !== undefined ? { latitude: address.latitude } : {}),
    ...(address.longitude !== undefined ? { longitude: address.longitude } : {}),
  };
}

function toShipmentResponse(shipment: ShipmentWithRelations, includeCustomer: boolean) {
  const response: Record<string, unknown> = {
    id: String((shipment as unknown as { _id: unknown })._id),
    shipmentNumber: shipment.shipmentNumber ?? null,
    trackingNumber: shipment.trackingNumber,
    externalOrderId: shipment.externalOrderId ?? null,
    externalCustomerId: shipment.externalCustomerId ?? null,
    externalSellerId: shipment.externalSellerId ?? null,
    status: shipment.status,
    serviceType: shipment.serviceType,
    origin: shipment.originAddress,
    destination: shipment.destinationAddress,
    estimatedDelivery: shipment.estimatedDelivery ?? null,
    actualDelivery: shipment.actualDelivery ?? null,
    weight: shipment.weight ?? null,
    description: shipment.description ?? null,
    currentLocation: shipment.currentLocation ?? null,
    createdAt: shipment.createdAt,
    updatedAt: shipment.updatedAt,
  };

  if (includeCustomer && shipment.customer) {
    response.customer = {
      id: shipment.customer.id ?? String((shipment.customer as { _id?: unknown })._id ?? ''),
      name: shipment.customer.name,
      email: shipment.customer.email,
      role: shipment.customer.role,
    };
  }

  if (shipment.trackingEvents) {
    response.trackingEvents = shipment.trackingEvents;
  }

  return response;
}

function shipmentRelations(includeTrackingEvents = false) {
  return [
    { path: 'customer', select: 'name email role' },
    { path: 'originAddress', select: '-__v' },
    { path: 'destinationAddress', select: '-__v' },
    ...(includeTrackingEvents ? [{ path: 'trackingEvents', options: { sort: { timestamp: -1 } }, select: '-__v' }] : []),
  ];
}

async function createShipmentTransaction(input: CreateShipmentInput) {
  const session = await mongoose.startSession();

  try {
    let created: ShipmentDocument | undefined;
    await session.withTransaction(async () => {
      if (!isObjectId(input.customerId)) {
        throw new ShipmentError(400, 'INVALID_CUSTOMER_ID', 'Invalid customer id.');
      }

      const customer = await User.findById(input.customerId).select('_id role').session(session).lean();
      if (!customer || customer.role !== 'CUSTOMER') {
        throw new ShipmentError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
      }

      const [originAddress, destinationAddress] = await Promise.all([
        new Address(toAddressInput(input.origin)).save({ session }),
        new Address(toAddressInput(input.destination)).save({ session }),
      ]);

      const shipment = new Shipment({
        shipmentNumber: generateShipmentNumber(),
        trackingNumber: generateTrackingNumber(),
        externalOrderId: input.externalOrderId,
        externalCustomerId: input.externalCustomerId,
        externalSellerId: input.externalSellerId,
        customerId: input.customerId,
        status: ShipmentStatus.CREATED,
        serviceType: input.serviceType,
        originAddressId: originAddress._id,
        destinationAddressId: destinationAddress._id,
        estimatedDelivery: input.estimatedDelivery,
        weight: input.weight,
        description: input.description,
        currentLocation: {
          name: 'Origin facility',
          city: input.origin.city,
          country: input.origin.country,
        },
      });
      await shipment.save({ session });

      await new TrackingEvent({
        shipmentId: shipment._id,
        status: ShipmentStatus.CREATED,
        description: 'Shipment created.',
        location: 'Origin facility',
        city: input.origin.city,
        country: input.origin.country,
        timestamp: new Date(),
      }).save({ session });

      created = shipment;
    });

    return created;
  } finally {
    await session.endSession();
  }
}

export function generateTrackingNumber(): string {
  return `ST${crypto.randomBytes(8).toString('hex').toUpperCase()}GH`;
}

export function generateShipmentNumber(date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replaceAll('-', '');
  const sequencePart = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `SHP-${datePart}-${sequencePart}`;
}

export async function createShipment(input: CreateShipmentInput) {
  for (let attempt = 1; attempt <= MAX_TRACKING_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const shipment = await createShipmentTransaction(input);
      if (!shipment) {
        throw new ShipmentError(500, 'SHIPMENT_CREATE_FAILED', 'Shipment could not be created.');
      }
      const shipmentId = String((shipment as unknown as { _id: unknown })._id);
      const result = await getShipmentById(shipmentId, {
        id: input.customerId,
        email: '',
        role: 'ADMIN',
      });
      await createShipmentNotification(shipmentId, ShipmentStatus.CREATED);
      return result;
    } catch (error) {
      if (!isDuplicateKey(error) || attempt === MAX_TRACKING_NUMBER_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new ShipmentError(500, 'SHIPMENT_CREATE_FAILED', 'Shipment could not be created.');
}

export async function listShipments(query: ShipmentQuery, user: RequestUser) {
  const filter: Record<string, unknown> = {};
  if (user.role === 'CUSTOMER') {
    filter.customerId = user.id;
  }

  if (query.status) filter.status = query.status;
  if (query.serviceType) filter.serviceType = query.serviceType;
  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search), 'i');
    const matchingCustomers = await User.find({ $or: [{ email: expression }, { name: expression }] })
      .select('_id')
      .lean();
    const searchFilter = [
      { trackingNumber: expression },
      { customerId: { $in: matchingCustomers.map((customer) => customer._id) } },
    ];
    filter.$and = [{ $or: searchFilter }];
  }

  const total = await Shipment.countDocuments(filter);
  const shipments = (await Shipment.find(filter)
    .sort({ [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit)
    .populate(shipmentRelations())
    .lean()) as unknown as ShipmentWithRelations[];

  return {
    shipments: shipments.map((shipment) => toShipmentResponse(shipment, user.role !== 'CUSTOMER')),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getShipmentById(id: string, user: RequestUser) {
  if (!isObjectId(id)) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  const filter: Record<string, unknown> = { _id: id };
  if (user.role === 'CUSTOMER') filter.customerId = user.id;

  const shipment = (await Shipment.findOne(filter).populate(shipmentRelations(true)).lean()) as unknown as ShipmentWithRelations | null;
  if (!shipment) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  return toShipmentResponse(shipment, user.role !== 'CUSTOMER');
}

export async function updateShipment(id: string, input: UpdateShipmentInput) {
  if (!isObjectId(id)) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  const session = await mongoose.startSession();
  try {
    let updated: ShipmentDocument | null = null;
    await session.withTransaction(async () => {
      const shipment = await Shipment.findById(id).session(session);
      if (!shipment) throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');

      const oldAddressIds: string[] = [];
      if (input.origin) {
        const address = await new Address(toAddressInput(input.origin)).save({ session });
        oldAddressIds.push(String(shipment.originAddressId));
        shipment.originAddressId = address._id;
      }
      if (input.destination) {
        const address = await new Address(toAddressInput(input.destination)).save({ session });
        oldAddressIds.push(String(shipment.destinationAddressId));
        shipment.destinationAddressId = address._id;
      }

      if (input.serviceType !== undefined) shipment.serviceType = input.serviceType as ServiceType;
      if (input.estimatedDelivery !== undefined) shipment.estimatedDelivery = input.estimatedDelivery ?? undefined;
      if (input.weight !== undefined) shipment.weight = input.weight ?? undefined;
      if (input.description !== undefined) shipment.description = input.description ?? undefined;
      if (input.currentLocation !== undefined) shipment.currentLocation = input.currentLocation ?? undefined;

      updated = await shipment.save({ session });
      if (oldAddressIds.length > 0) {
        await Address.deleteMany({ _id: { $in: oldAddressIds } }).session(session);
      }
    });

    if (!updated) throw new ShipmentError(500, 'SHIPMENT_UPDATE_FAILED', 'Shipment could not be updated.');
    const shipment = await getShipmentById(String((updated as unknown as { _id: unknown })._id), { id: '', email: '', role: 'ADMIN' });
    publishShipmentUpdated(shipmentRealtimeSnapshot(shipment));
    return shipment;
  } finally {
    await session.endSession();
  }
}

export async function deleteShipment(id: string) {
  if (!isObjectId(id)) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const shipment = await Shipment.findById(id).session(session).lean();
      if (!shipment) throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');

      await TrackingEvent.deleteMany({ shipmentId: id }).session(session);
      await Address.deleteMany({ _id: { $in: [shipment.originAddressId, shipment.destinationAddressId] } }).session(session);
      await Shipment.deleteOne({ _id: id }).session(session);
    });
  } finally {
    await session.endSession();
  }
}
