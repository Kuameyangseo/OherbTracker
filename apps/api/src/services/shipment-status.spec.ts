import { describe, expect, it } from '@jest/globals';
import { Package, Shipment, TrackingEvent } from '@oherb-tracker/database';
import { ShipmentStatus } from '@oherb-tracker/shared-types';
import {
  packageCreateSchema,
  trackingEventSchema,
  shipmentCreateSchema,
} from '@oherb-tracker/validation';
import { canTransitionShipmentStatus } from './shipment-status.js';
import { generatePackageNumber } from './package.service.js';
import {
  generateShipmentNumber,
  generateTrackingNumber,
} from './shipment.service.js';
import {
  notificationTitle,
  notificationTypeForStatus,
} from './notification.service.js';

describe('shipment status transitions', () => {
  it('allows the supported forward transitions', () => {
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.CREATED,
        ShipmentStatus.LABEL_CREATED,
      ),
    ).toBe(true);
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.ARRIVED_AT_FACILITY,
      ),
    ).toBe(true);
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.DEPARTED_FACILITY,
        ShipmentStatus.OUT_FOR_DELIVERY,
      ),
    ).toBe(true);
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.OUT_FOR_DELIVERY,
        ShipmentStatus.DELIVERED,
      ),
    ).toBe(true);
  });

  it('rejects terminal and backwards transitions', () => {
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.DELIVERED,
        ShipmentStatus.CREATED,
      ),
    ).toBe(false);
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.CREATED,
        ShipmentStatus.DELIVERED,
      ),
    ).toBe(false);
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.CANCELLED,
        ShipmentStatus.IN_TRANSIT,
      ),
    ).toBe(false);
    expect(
      canTransitionShipmentStatus(
        ShipmentStatus.RETURNED,
        ShipmentStatus.DELIVERED,
      ),
    ).toBe(false);
  });
});

describe('tracking event validation', () => {
  it('rejects client-controlled fields and invalid coordinates', () => {
    expect(
      trackingEventSchema.safeParse({
        status: ShipmentStatus.IN_TRANSIT,
        shipmentId: 'not-allowed',
        latitude: 100,
      }).success,
    ).toBe(false);
  });

  it('accepts a valid event without a client timestamp', () => {
    expect(
      trackingEventSchema.safeParse({
        status: ShipmentStatus.IN_TRANSIT,
        description: 'Departed facility',
        location: 'Kumasi Hub',
        city: 'Kumasi',
        country: 'Ghana',
      }).success,
    ).toBe(true);
  });

  it('requires latitude and longitude together', () => {
    expect(
      trackingEventSchema.safeParse({
        status: ShipmentStatus.IN_TRANSIT,
        description: 'At facility',
        location: 'Kumasi Hub',
        city: 'Kumasi',
        country: 'Ghana',
        latitude: 6.6885,
      }).success,
    ).toBe(false);
  });
});

describe('tracking number generation', () => {
  it('creates uppercase human-readable tracking numbers', () => {
    const trackingNumber = generateTrackingNumber();

    expect(trackingNumber).toMatch(/^ST[A-F0-9]{16}GH$/);
    expect(trackingNumber).not.toContain(' ');
  });

  describe('shipment notifications', () => {
    it('maps customer-visible shipment statuses to notification types and titles', () => {
      expect(notificationTypeForStatus(ShipmentStatus.DELIVERED)).toBe(
        'SHIPMENT_DELIVERED',
      );
      expect(
        notificationTitle(
          notificationTypeForStatus(ShipmentStatus.OUT_FOR_DELIVERY)!,
        ),
      ).toBe('Shipment out for delivery');
    });

    it('does not create a notification type for non-notifiable statuses', () => {
      expect(
        notificationTypeForStatus(ShipmentStatus.LABEL_CREATED),
      ).toBeUndefined();
    });
  });
});

describe('shipment number generation', () => {
  it('creates a dated shipment number with a six-digit suffix', () => {
    expect(
      generateShipmentNumber(new Date('2026-09-17T12:00:00.000Z')),
    ).toMatch(/^SHP-20260917-\d{6}$/);
  });
});

describe('package model and validation', () => {
  const shipmentId = '507f1f77bcf86cd799439011';
  const packageInput = {
    shipmentId,
    trackingNumber: 'PKGTRK-10045',
    weight: 2.5,
    weightUnit: 'KG',
    dimensions: { length: 30, width: 20, height: 15 },
    dimensionUnit: 'CM',
    packageType: 'BOX',
    status: ShipmentStatus.LABEL_CREATED,
  };

  it('accepts a valid package and rejects invalid measurements and units', () => {
    expect(packageCreateSchema.safeParse(packageInput).success).toBe(true);
    expect(
      packageCreateSchema.safeParse({ ...packageInput, weight: -1 }).success,
    ).toBe(false);
    expect(
      packageCreateSchema.safeParse({
        ...packageInput,
        dimensions: { ...packageInput.dimensions, height: -1 },
      }).success,
    ).toBe(false);
    expect(
      packageCreateSchema.safeParse({ ...packageInput, weightUnit: 'OUNCE' })
        .success,
    ).toBe(false);
    expect(
      packageCreateSchema.safeParse({ ...packageInput, status: 'NOT_A_STATUS' })
        .success,
    ).toBe(false);
  });

  it('can construct a valid Package document for a Shipment', async () => {
    const packageDocument = new Package({
      ...packageInput,
      packageNumber: 'PKG-20260917-000001',
    });

    await expect(packageDocument.validate()).resolves.toBeUndefined();
  });

  it('defines the package relationship and unique identifier fields', () => {
    expect(Package.schema.path('shipmentId')).toBeDefined();
    expect(Package.schema.path('packageNumber')).toBeDefined();
    expect(Package.schema.path('trackingNumber')).toBeDefined();
    expect(Shipment.schema.path('packageIds')).toBeDefined();
  });

  it('allows multiple package references on one shipment', () => {
    const shipment = new Shipment({
      customerId: shipmentId,
      trackingNumber: 'SHIPTRK-10045',
      status: ShipmentStatus.LABEL_CREATED,
      serviceType: 'STANDARD',
      originAddressId: shipmentId,
      destinationAddressId: '507f1f77bcf86cd799439012',
      packageIds: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    });

    expect(shipment.packageIds).toHaveLength(2);
  });

  it('generates a dated package number', () => {
    expect(generatePackageNumber(new Date('2026-09-17T12:00:00.000Z'))).toMatch(
      /^PKG-20260917-\d{6}$/,
    );
  });

  it('keeps old events valid and accepts optional package references', async () => {
    const oldEvent = new TrackingEvent({
      shipmentId,
      status: ShipmentStatus.LABEL_CREATED,
      description: 'Label created',
      location: 'Origin facility',
      city: 'Accra',
      country: 'Ghana',
      timestamp: new Date(),
    });
    const packageEvent = new TrackingEvent({
      ...oldEvent.toObject(),
      _id: undefined,
      packageId: '507f1f77bcf86cd799439013',
      trackingNumber: 'PKGTRK-10045',
    });

    await expect(oldEvent.validate()).resolves.toBeUndefined();
    await expect(packageEvent.validate()).resolves.toBeUndefined();
    expect(
      trackingEventSchema.safeParse({
        status: ShipmentStatus.LABEL_CREATED,
        description: 'Package label created',
        location: 'Origin facility',
        city: 'Accra',
        country: 'Ghana',
        packageId: shipmentId,
        trackingNumber: 'PKGTRK-10045',
      }).success,
    ).toBe(true);
  });
});

describe('e-commerce shipment compatibility', () => {
  it('accepts external order, customer, and seller references', () => {
    const result = shipmentCreateSchema.safeParse({
      customerId: 'internal-customer-id',
      externalOrderId: 'ORD-10045',
      externalCustomerId: 'CUS-123',
      externalSellerId: 'SELLER-456',
      serviceType: 'STANDARD',
      origin: {
        name: 'ABC Store',
        phone: '0240000000',
        addressLine1: '123 Main Street',
        city: 'Accra',
        postalCode: 'GA001',
        country: 'Ghana',
      },
      destination: {
        name: 'John Doe',
        phone: '0200000000',
        addressLine1: '456 Street',
        city: 'Kumasi',
        postalCode: 'AK001',
        country: 'Ghana',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.externalOrderId).toBe('ORD-10045');
      expect(result.data.externalCustomerId).toBe('CUS-123');
      expect(result.data.externalSellerId).toBe('SELLER-456');
    }
  });

  it('exposes optional integration fields on the existing Shipment model', () => {
    expect(Shipment.schema.path('shipmentNumber')).toBeDefined();
    expect(Shipment.schema.path('externalOrderId')).toBeDefined();
    expect(Shipment.schema.path('externalCustomerId')).toBeDefined();
    expect(Shipment.schema.path('externalSellerId')).toBeDefined();
  });
});
