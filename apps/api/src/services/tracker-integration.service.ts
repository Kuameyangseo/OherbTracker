import mongoose from 'mongoose';
import {
  Address,
  Package,
  Shipment,
  TrackingEvent,
} from '@oherb-tracker/database';
import { ShipmentStatus } from '@oherb-tracker/shared-types';
import type { TrackerIntegrationShipmentInput } from '@oherb-tracker/validation';
import { generatePackageNumber } from './package.service.js';
import {
  generateShipmentNumber,
  generateTrackingNumber,
  ShipmentError,
} from './shipment.service.js';

function duplicateKey(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 11000,
  );
}

function addressInput(address: TrackerIntegrationShipmentInput['sender']) {
  return {
    name: address.name,
    phone: address.phone,
    email: address.email,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
  };
}

export async function createTrackerIntegrationShipment(
  input: TrackerIntegrationShipmentInput,
) {
  const session = await mongoose.startSession();

  try {
    let result:
      | {
          shipmentId: string;
          shipmentNumber: string;
          trackingNumber: string;
          externalOrderId: string;
          status: ShipmentStatus;
          package: { packageId: string; packageNumber: string };
        }
      | undefined;

    await session.withTransaction(async () => {
      const existing = await Shipment.findOne({
        externalOrderId: input.externalOrderId,
      })
        .session(session)
        .lean();
      if (existing) {
        throw new ShipmentError(
          409,
          'SHIPMENT_ALREADY_EXISTS',
          'A shipment already exists for this order.',
        );
      }

      const [sender, recipient] = await Promise.all([
        new Address(addressInput(input.sender)).save({ session }),
        new Address(addressInput(input.recipient)).save({ session }),
      ]);
      const shipment = new Shipment({
        shipmentNumber: generateShipmentNumber(),
        trackingNumber: generateTrackingNumber(),
        externalOrderId: input.externalOrderId,
        externalCustomerId: input.externalCustomerId,
        externalSellerId: input.externalSellerId,
        status: ShipmentStatus.LABEL_CREATED,
        serviceType: input.service,
        originAddressId: sender._id,
        destinationAddressId: recipient._id,
        currentLocation: {
          name: 'Origin facility',
          city: input.sender.city,
          country: input.sender.country,
        },
      });
      await shipment.save({ session });

      const packageDocument = new Package({
        shipmentId: shipment._id,
        packageNumber: generatePackageNumber(),
        trackingNumber: generateTrackingNumber(),
        weight: input.package.weight,
        weightUnit: input.package.weightUnit,
        dimensions: input.package.dimensions,
        dimensionUnit: input.package.dimensionUnit,
        packageType: input.package.packageType,
        description: input.package.description,
        status: ShipmentStatus.LABEL_CREATED,
      });
      await packageDocument.save({ session });

      shipment.packageIds = [packageDocument._id];
      await shipment.save({ session });

      await new TrackingEvent({
        shipmentId: shipment._id,
        packageId: packageDocument._id,
        trackingNumber: packageDocument.trackingNumber,
        status: ShipmentStatus.LABEL_CREATED,
        description: 'Shipment label created.',
        location: 'Origin facility',
        city: input.sender.city,
        country: input.sender.country,
        timestamp: new Date(),
      }).save({ session });

      result = {
        shipmentId: String(shipment._id),
        shipmentNumber: shipment.shipmentNumber!,
        trackingNumber: shipment.trackingNumber,
        externalOrderId: shipment.externalOrderId!,
        status: shipment.status,
        package: {
          packageId: String(packageDocument._id),
          packageNumber: packageDocument.packageNumber,
        },
      };
    });

    if (!result)
      throw new ShipmentError(
        500,
        'SHIPMENT_CREATE_FAILED',
        'Shipment could not be created.',
      );
    return result;
  } catch (error) {
    if (duplicateKey(error)) {
      throw new ShipmentError(
        409,
        'SHIPMENT_ALREADY_EXISTS',
        'A shipment already exists for this order.',
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function getTrackerIntegrationShipmentByOrder(externalOrderId: string) {
  const shipment = await Shipment.findOne({ externalOrderId }).lean();

  if (!shipment) {
    throw new ShipmentError(404, 'SHIPMENT_NOT_FOUND', 'Shipment not found.');
  }

  return {
    shipmentId: String(shipment._id),
    shipmentNumber: shipment.shipmentNumber,
    trackingNumber: shipment.trackingNumber,
    externalOrderId: shipment.externalOrderId,
    status: shipment.status,
    createdAt: shipment.createdAt,
  };
}
