import mongoose from 'mongoose';
import crypto from 'node:crypto';
import {
  Address,
  Package,
  Shipment,
  TrackingEvent,
  User,
  Notification,
} from '@oherb-tracker/database';
import { ShipmentStatus, UserRole } from '@oherb-tracker/shared-types';
import type { TrackerIntegrationShipmentInput } from '@oherb-tracker/validation';
import { generatePackageNumber } from './package.service.js';
import {
  generateShipmentNumber,
  generateTrackingNumber,
  ShipmentError,
} from './shipment.service.js';
import { geocodeAddress } from './geocoding.service.js';

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
    ...(address.latitude !== undefined ? { latitude: address.latitude } : {}),
    ...(address.longitude !== undefined ? { longitude: address.longitude } : {}),
  };
}

type CarrierLabel = {
  id: string;
  trackingNumber: string;
  format: 'PDF';
  url: string;
};

export function generateCarrierLabel(trackingNumber: string, carrier = 'OherbTracker', labelUrl?: string): CarrierLabel {
  return {
    id: `LBL-${trackingNumber}`,
    trackingNumber,
    format: 'PDF',
    url: labelUrl || `/api/v1/shipments/labels/${trackingNumber}`,
  };
}

async function ensureIntegrationUser(input: {
  externalId: string;
  role: UserRole.CUSTOMER | UserRole.SELLER;
  name: string;
  email?: string;
  phone: string;
}) {
  const normalizedEmail = input.email?.trim().toLowerCase();
  let user = await User.findOne({
    $or: [
      { externalCustomerId: input.externalId, role: input.role },
      { externalSellerId: input.externalId, role: input.role },
      ...(normalizedEmail ? [{ email: normalizedEmail, role: input.role }] : []),
    ],
  }).select('_id role');

  if (user) {
    await User.updateOne(
      { _id: user._id },
      input.role === UserRole.SELLER
        ? { $set: { externalSellerId: input.externalId } }
        : { $set: { externalCustomerId: input.externalId } },
    );
    return user;
  }

  const email = normalizedEmail || `${input.externalId}@integration.invalid`;
  try {
    user = await User.create({
      name: input.name,
      email,
      phone: input.phone,
      ...(input.role === UserRole.SELLER
        ? { externalSellerId: input.externalId }
        : { externalCustomerId: input.externalId }),
      role: input.role,
      passwordHash: crypto.randomBytes(32).toString('hex'),
    });
    return user;
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    user = await User.findOne({ email, role: input.role }).select('_id role');
    if (!user) {
      throw new ShipmentError(
        409,
        input.role === UserRole.SELLER ? 'SELLER_EMAIL_ROLE_CONFLICT' : 'CUSTOMER_EMAIL_ROLE_CONFLICT',
        `The ${input.role.toLowerCase()} email belongs to a different tracker role.`,
      );
    }
    await User.updateOne(
      { _id: user._id },
      input.role === UserRole.SELLER
        ? { $set: { externalSellerId: input.externalId } }
        : { $set: { externalCustomerId: input.externalId } },
    );
    return user;
  }
}

export async function createTrackerIntegrationShipment(
  input: TrackerIntegrationShipmentInput,
) {
  const existingShipment = await Shipment.findOne({
    externalOrderId: input.externalOrderId,
  }).lean();
  if (existingShipment) {
    const [senderInput, recipientInput] = await Promise.all([
      geocodeAddress(addressInput(input.sender)),
      geocodeAddress(addressInput(input.recipient)),
    ]);
    await Promise.all([
      Address.findByIdAndUpdate(existingShipment.originAddressId, senderInput, { new: true }),
      Address.findByIdAndUpdate(existingShipment.destinationAddressId, recipientInput, { new: true }),
      Package.findOneAndUpdate(
        { shipmentId: existingShipment._id },
        {
          $set: {
            weight: input.package.weight,
            weightUnit: input.package.weightUnit,
            dimensions: input.package.dimensions,
            dimensionUnit: input.package.dimensionUnit,
            packageType: input.package.packageType,
            description: input.package.description,
          },
        },
        { new: true },
      ),
      Shipment.findByIdAndUpdate(existingShipment._id, {
        $set: {
          serviceType: input.service,
          currentLocation: {
            name: input.currentLocation?.name || input.sender.name,
            city: input.currentLocation?.city || senderInput.city,
            country: input.currentLocation?.country || senderInput.country,
            ...(input.currentLocation
              ? { latitude: input.currentLocation.latitude, longitude: input.currentLocation.longitude }
              : {}),
          },
        },
      }),
    ]);
    const existingPackage = await Package.findOne({
      shipmentId: existingShipment._id,
    }).lean();
    const existingLabel = generateCarrierLabel(
      existingShipment.trackingNumber,
      input.carrier,
      input.labelUrl,
    );
    return {
      shipmentId: String(existingShipment._id),
      shipmentNumber: existingShipment.shipmentNumber!,
      trackingNumber: existingShipment.trackingNumber,
      externalOrderId: existingShipment.externalOrderId!,
      customerId: String(existingShipment.customerId),
      sellerId: String(existingShipment.sellerId),
      status: existingShipment.status,
      currentLocation: existingShipment.currentLocation,
      package: {
        packageId: existingPackage ? String(existingPackage._id) : '',
        packageNumber: existingPackage?.packageNumber || '',
        label: existingLabel,
      },
    };
  }

  const customerUser = await ensureIntegrationUser({
    externalId: input.externalCustomerId,
    role: UserRole.CUSTOMER,
    name: input.recipient.name,
    email: input.recipient.email,
    phone: input.recipient.phone,
  });
  const sellerUser = await ensureIntegrationUser({
    externalId: input.externalSellerId,
    role: UserRole.SELLER,
    name: input.seller.name,
    email: input.seller.email,
    phone: input.seller.phone,
  });

  const session = await mongoose.startSession();

  try {
    let result:
      | {
          shipmentId: string;
          shipmentNumber: string;
          trackingNumber: string;
          externalOrderId: string;
          customerId: string;
          sellerId: string;
          status: ShipmentStatus;
          currentLocation?: {
            name: string;
            city: string;
            country: string;
            latitude?: number | null;
            longitude?: number | null;
          } | null;
          package: {
            packageId: string;
            packageNumber: string;
            label: CarrierLabel;
          };
        }
      | undefined;

    await session.withTransaction(async () => {
      const existing = await Shipment.findOne({
        externalOrderId: input.externalOrderId,
      })
        .session(session)
        .lean();
      if (existing) {
        const existingPackage = await Package.findOne({
          shipmentId: existing._id,
        }).session(session).lean();
        const existingLabel = generateCarrierLabel(
          existing.trackingNumber,
          input.carrier,
          input.labelUrl,
        );
        result = {
          shipmentId: String(existing._id),
          shipmentNumber: existing.shipmentNumber!,
          trackingNumber: existing.trackingNumber,
          externalOrderId: existing.externalOrderId!,
          customerId: String(existing.customerId),
          sellerId: String(existing.sellerId),
          status: existing.status,
          currentLocation: existing.currentLocation,
          package: {
            packageId: existingPackage ? String(existingPackage._id) : '',
            packageNumber: existingPackage?.packageNumber || '',
            label: existingLabel,
          },
        };
        return;
      }

      let customer = await User.findOne({ _id: customerUser._id, role: UserRole.CUSTOMER })
        .select('_id')
        .session(session)
        .lean();

      if (!customer && input.recipient.email) {
        customer = await User.findOne({
          email: input.recipient.email.toLowerCase(),
          role: UserRole.CUSTOMER,
        })
          .select('_id')
          .session(session)
          .lean();

        if (customer) {
          await User.updateOne(
            { _id: customer._id },
            { $set: { externalCustomerId: input.externalCustomerId } },
            { session },
          );
        }
      }

      if (!customer) {
        const recipient = input.recipient;
        const customerEmail = recipient.email?.trim().toLowerCase()
          || `${input.externalCustomerId}@integration.invalid`;
        try {
          const createdCustomer = await User.create([{
            name: recipient.name,
            email: customerEmail,
            phone: recipient.phone,
            externalCustomerId: input.externalCustomerId,
            role: UserRole.CUSTOMER,
            passwordHash: crypto.randomBytes(32).toString('hex'),
          }], { session });
          customer = createdCustomer[0];
        } catch (error) {
          if (!duplicateKey(error)) throw error;
          customer = await User.findOne({ email: customerEmail, role: UserRole.CUSTOMER })
            .select('_id')
            .session(session)
            .lean();
          if (customer) {
            await User.updateOne(
              { _id: customer._id },
              { $set: { externalCustomerId: input.externalCustomerId } },
              { session },
            );
          } else {
            throw new ShipmentError(409, 'CUSTOMER_EMAIL_ROLE_CONFLICT', 'The customer email belongs to a non-customer tracker account.');
          }
        }
      }

      if (!customer) {
        throw new ShipmentError(
          404,
          'CUSTOMER_NOT_FOUND',
          'Customer could not be provisioned for this shipment.',
        );
      }

      let seller = await User.findOne({ _id: sellerUser._id, role: UserRole.SELLER })
        .select('_id')
        .session(session)
        .lean();

      if (!seller) {
        seller = await User.findOne({
          externalCustomerId: input.externalSellerId,
          role: UserRole.SELLER,
        })
          .select('_id')
          .session(session)
          .lean();
        if (seller) {
          await User.updateOne(
            { _id: seller._id },
            { $set: { externalSellerId: input.externalSellerId }, $unset: { externalCustomerId: '' } },
            { session },
          );
        }
      }

      if (!seller) {
        const sellerEmail = input.seller.email?.trim().toLowerCase()
          || `${input.externalSellerId}@integration.invalid`;
        try {
          const createdSeller = await User.create([{
            name: input.seller.name,
            email: sellerEmail,
            phone: input.seller.phone,
            externalSellerId: input.externalSellerId,
            role: UserRole.SELLER,
            passwordHash: crypto.randomBytes(32).toString('hex'),
          }], { session });
          seller = createdSeller[0];
        } catch (error) {
          if (!duplicateKey(error)) throw error;
          seller = await User.findOne({ email: sellerEmail, role: UserRole.SELLER })
            .select('_id')
            .session(session)
            .lean();
          if (seller) {
            await User.updateOne(
              { _id: seller._id },
              { $set: { externalSellerId: input.externalSellerId } },
              { session },
            );
          } else {
            throw new ShipmentError(409, 'SELLER_EMAIL_ROLE_CONFLICT', 'The seller email belongs to a non-seller tracker account.');
          }
        }
      }

      const [senderInput, recipientInput] = await Promise.all([
        geocodeAddress(addressInput(input.sender)),
        geocodeAddress(addressInput(input.recipient)),
      ]);
      // MongoDB transactions must not run concurrent operations on one session.
      const sender = await new Address(senderInput).save({ session });
      const recipient = await new Address(recipientInput).save({ session });
      const shipment = new Shipment({
        shipmentNumber: generateShipmentNumber(),
        trackingNumber: input.trackingNumber || generateTrackingNumber(),
        externalOrderId: input.externalOrderId,
        externalCustomerId: input.externalCustomerId,
        externalSellerId: input.externalSellerId,
        customerId: customer._id,
        sellerId: seller._id,
        status: ShipmentStatus.LABEL_CREATED,
        serviceType: input.service,
        originAddressId: sender._id,
        destinationAddressId: recipient._id,
        currentLocation: {
          name: input.currentLocation?.name || `${input.sender.name} - ${input.sender.addressLine1}, ${input.sender.city}`.slice(0, 120),
          city: input.currentLocation?.city || senderInput.city,
          country: input.currentLocation?.country || senderInput.country,
          ...(input.currentLocation
            ? {
                latitude: input.currentLocation.latitude,
                longitude: input.currentLocation.longitude,
              }
            : senderInput.latitude !== undefined && senderInput.longitude !== undefined
              ? { latitude: senderInput.latitude, longitude: senderInput.longitude }
              : {}),
        },
      });
      await shipment.save({ session });

      const label = generateCarrierLabel(shipment.trackingNumber, input.carrier, input.labelUrl);

      const packageDocument = new Package({
        shipmentId: shipment._id,
        packageNumber: generatePackageNumber(),
        trackingNumber: shipment.trackingNumber,
        weight: input.package.weight,
        weightUnit: input.package.weightUnit,
        dimensions: input.package.dimensions,
        dimensionUnit: input.package.dimensionUnit,
        packageType: input.package.packageType,
        description: input.package.description,
        status: ShipmentStatus.LABEL_CREATED,
        carrier: input.carrier,
        carrierLabelId: label.id,
        carrierLabelUrl: label.url,
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
        location: `${input.sender.name} - ${input.sender.addressLine1}, ${input.sender.city}`.slice(0, 160),
        city: input.sender.city,
        country: input.sender.country,
        timestamp: new Date(),
      }).save({ session });

      result = {
        shipmentId: String(shipment._id),
        shipmentNumber: shipment.shipmentNumber!,
        trackingNumber: shipment.trackingNumber,
        externalOrderId: shipment.externalOrderId!,
        customerId: String(customer._id),
        sellerId: String(seller._id),
        status: shipment.status,
        currentLocation: shipment.currentLocation,
        package: {
          packageId: String(packageDocument._id),
          packageNumber: packageDocument.packageNumber,
          label,
        },
      };
    });

    if (!result)
      throw new ShipmentError(
        500,
        'SHIPMENT_CREATE_FAILED',
        'Shipment could not be created.',
      );
    if (result && input.notifyStaff) {
      await notifyStaffOfIntegrationShipment(result);
    }
    return result;
  } catch (error) {
    if (duplicateKey(error)) {
      const existing = await Shipment.findOne({
        externalOrderId: input.externalOrderId,
      }).lean();
      if (existing) {
        const existingPackage = await Package.findOne({ shipmentId: existing._id }).lean();
        return {
          shipmentId: String(existing._id),
          shipmentNumber: existing.shipmentNumber!,
          trackingNumber: existing.trackingNumber,
          externalOrderId: existing.externalOrderId!,
          customerId: String(existing.customerId),
          sellerId: String(existing.sellerId),
          status: existing.status,
          currentLocation: existing.currentLocation,
          package: {
            packageId: existingPackage ? String(existingPackage._id) : '',
            packageNumber: existingPackage?.packageNumber || '',
            label: generateCarrierLabel(existing.trackingNumber, input.carrier, input.labelUrl),
          },
        };
      }
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function notifyStaffOfIntegrationShipment(result: {
  shipmentId: string;
  trackingNumber: string;
  externalOrderId: string;
}) {
  const staff = await User.findOne({
    role: { $in: [UserRole.STAFF, UserRole.ADMIN] },
  })
    .select('_id')
    .lean();
  if (!staff) return;

  await Notification.create({
    userId: staff._id,
    type: 'SYSTEM',
    title: 'Integrated shipment created',
    message: `Order ${result.externalOrderId} created shipment ${result.trackingNumber}.`,
    shipmentId: result.shipmentId,
    trackingNumber: result.trackingNumber,
    metadata: { source: 'tracker-integration' },
  });
}

export async function getTrackerIntegrationShipmentByOrder(externalOrderId: string) {
  const shipment = await Shipment.findOne({ externalOrderId })
    .populate({ path: 'originAddress', select: 'latitude longitude city country' })
    .populate({ path: 'destinationAddress', select: 'latitude longitude city country' })
    .lean();

  if (!shipment) {
    return null;
  }

  const currentLocation = shipment.currentLocation;
  const populatedShipment = shipment as unknown as {
    originAddress?: { latitude?: number; longitude?: number; city?: string; country?: string } | null;
    destinationAddress?: { latitude?: number; longitude?: number; city?: string; country?: string } | null;
  };
  const origin = populatedShipment.originAddress;
  const destination = populatedShipment.destinationAddress;
  const location = currentLocation?.latitude !== undefined && currentLocation.longitude !== undefined
    ? currentLocation
    : origin?.latitude !== undefined && origin.longitude !== undefined
      ? { name: 'Origin facility', city: origin.city ?? '', country: origin.country ?? '', latitude: origin.latitude, longitude: origin.longitude }
      : destination?.latitude !== undefined && destination.longitude !== undefined
        ? { name: 'Destination', city: destination.city ?? '', country: destination.country ?? '', latitude: destination.latitude, longitude: destination.longitude }
        : null;

  return {
    shipmentId: String(shipment._id),
    shipmentNumber: shipment.shipmentNumber,
    trackingNumber: shipment.trackingNumber,
    externalOrderId: shipment.externalOrderId,
    status: shipment.status,
    currentLocation: location,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    createdAt: shipment.createdAt,
  };
}

export async function getTrackerIntegrationShipmentByTrackingNumber(trackingNumber: string) {
  const shipment = await Shipment.findOne({ trackingNumber }).lean();
  if (!shipment) return null;
  return {
    shipmentId: String(shipment._id),
    shipmentNumber: shipment.shipmentNumber,
    trackingNumber: shipment.trackingNumber,
    externalOrderId: shipment.externalOrderId,
    status: shipment.status,
    currentLocation: shipment.currentLocation,
    createdAt: shipment.createdAt,
  };
}

export async function updateTrackerIntegrationShipmentLocation(
  externalOrderId: string,
  currentLocation: { name: string; city: string; country: string; latitude: number; longitude: number },
) {
  const shipment = await Shipment.findOneAndUpdate(
    { externalOrderId },
    { $set: { currentLocation } },
    { new: true },
  ).lean();
  if (!shipment) return null;
  return {
    shipmentId: String(shipment._id),
    shipmentNumber: shipment.shipmentNumber,
    trackingNumber: shipment.trackingNumber,
    externalOrderId: shipment.externalOrderId,
    status: shipment.status,
    currentLocation: shipment.currentLocation,
    createdAt: shipment.createdAt,
  };
}
