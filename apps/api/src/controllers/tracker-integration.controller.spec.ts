import { describe, expect, it, jest } from '@jest/globals';
import { serverConfig } from '@oherb-tracker/config';
import { ServiceType, ShipmentStatus } from '@oherb-tracker/shared-types';
import { shipmentStatusUpdateSchema, trackerIntegrationShipmentSchema } from '@oherb-tracker/validation';
import { trackerApiAuth } from '../middleware/tracker-api-auth.js';
import { createTrackerIntegrationShipment } from '../services/tracker-integration.service.js';
import { getPublicTracking } from '../services/tracking.service.js';
import trackerIntegrationRouter from '../routes/tracker-integration.routes.js';
import {
  createTrackerIntegrationShipmentController,
  getPublicTrackingController,
  updateTrackerIntegrationShipmentLocationController,
  updateTrackerIntegrationShipmentStatusController,
} from './tracker-integration.controller.js';

const validPayload = {
  externalOrderId: 'ORDER-123',
  externalCustomerId: 'CUSTOMER-123',
  externalSellerId: 'SELLER-123',
  carrier: 'OherbTracker',
  service: 'STANDARD',
  sender: {
    name: 'ABC Store',
    phone: '0240000000',
    email: 'store@example.com',
    addressLine1: '123 Main Street',
    city: 'Accra',
    postalCode: 'GA001',
    country: 'Ghana',
  },
  recipient: {
    name: 'John Doe',
    phone: '0200000000',
    email: 'john@example.com',
    addressLine1: '456 Street',
    city: 'Kumasi',
    postalCode: 'AK001',
    country: 'Ghana',
  },
  package: {
    weight: 2,
    weightUnit: 'kg',
    dimensions: { length: 20, width: 15, height: 10 },
    dimensionUnit: 'cm',
    packageType: 'BOX',
    description: 'Example package',
  },
};

function responseDouble() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  } as any;
  response.status.mockReturnValue(response);
  return response;
}

function authRequest(authorization?: string) {
  return { header: jest.fn().mockReturnValue(authorization) } as any;
}

describe('tracker API authentication', () => {
  it.each([
    ['missing', undefined],
    ['malformed', 'Basic secret'],
    ['incorrect', 'Bearer wrong-key'],
  ])('rejects %s credentials', (_case, authorization) => {
    const previousKey = serverConfig.trackerApiKey;
    serverConfig.trackerApiKey = 'test-key';
    const response = responseDouble();
    const next = jest.fn();

    trackerApiAuth(authRequest(authorization), response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    serverConfig.trackerApiKey = previousKey;
  });

  it('accepts the configured Bearer credential', () => {
    const previousKey = serverConfig.trackerApiKey;
    serverConfig.trackerApiKey = 'test-key';
    const response = responseDouble();
    const next = jest.fn();

    trackerApiAuth(authRequest('Bearer test-key'), response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
    serverConfig.trackerApiKey = previousKey;
  });
});

describe('versioned public tracking route', () => {
  it('exposes the public tracking lookup at /api/v1/shipments/track/:trackingNumber without server auth', () => {
    const routes = (trackerIntegrationRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
      .map((layer) => layer.route)
      .filter((route): route is { path: string; methods: Record<string, boolean> } => Boolean(route));

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/shipments/track/:trackingNumber',
          methods: expect.objectContaining({ get: true }),
        }),
      ]),
    );
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/shipments',
          methods: expect.objectContaining({ post: true }),
        }),
      ]),
    );
  });
});

describe('public tracking controller', () => {
  it('returns the public tracking payload for a valid tracking number', async () => {
    const response = responseDouble();
    const lookup = jest.fn<typeof getPublicTracking>();
    lookup.mockResolvedValue({
      trackingNumber: 'ST1234567890ABCDEF12GH',
      status: ShipmentStatus.IN_TRANSIT,
      serviceType: ServiceType.STANDARD,
      estimatedDelivery: null,
      actualDelivery: null,
      currentLocation: null,
      origin: { city: 'Accra', state: null, country: 'Ghana' },
      destination: { city: 'Kumasi', state: null, country: 'Ghana' },
      events: [
        {
          id: 'evt_123',
          packageId: undefined,
          trackingNumber: 'ST1234567890ABCDEF12GH',
          status: ShipmentStatus.LABEL_CREATED,
          description: 'Label created',
          location: 'Origin facility',
          city: 'Accra',
          country: 'Ghana',
          latitude: null,
          longitude: null,
          timestamp: new Date('2026-09-17T00:00:00.000Z'),
        },
      ],
    });

    await getPublicTrackingController(lookup)(
      { params: { trackingNumber: 'ST1234567890ABCDEF12GH' } } as any,
      response,
    );

    expect(lookup).toHaveBeenCalledWith('ST1234567890ABCDEF12GH');
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        trackingNumber: 'ST1234567890ABCDEF12GH',
        status: ShipmentStatus.IN_TRANSIT,
        events: expect.any(Array),
      }),
    });
  });

  it('returns a 404 envelope for invalid tracking numbers', async () => {
    const response = responseDouble();

    await getPublicTrackingController()(
      { params: { trackingNumber: 'bad' } } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'SHIPMENT_NOT_FOUND',
        message: 'Shipment not found.',
      },
    });
  });
});

describe('tracker shipment contract', () => {
  it('exposes an authenticated status callback route', () => {
    const routes = (trackerIntegrationRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }> }).stack
      .map((layer) => layer.route)
      .filter((route): route is { path: string; methods: Record<string, boolean> } => Boolean(route));

    expect(routes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: '/shipments/order/:externalOrderId/status',
        methods: expect.objectContaining({ patch: true }),
      }),
    ]));
  });

  it('accepts a delivery callback and delegates it by external order id', async () => {
    const response = responseDouble();
    const updateStatus = jest.fn();
    updateStatus.mockResolvedValue({ shipmentId: 'shipment-1', status: ShipmentStatus.DELIVERED });
    const body = {
      status: 'DELIVERED',
      description: 'Package delivered',
      location: 'Customer address',
      city: 'Accra',
      country: 'Ghana',
    };

    await updateTrackerIntegrationShipmentStatusController(updateStatus)(
      { params: { externalOrderId: 'ORDER-123' }, body } as any,
      response,
    );

    expect(updateStatus).toHaveBeenCalledWith('ORDER-123', expect.objectContaining({ status: ShipmentStatus.DELIVERED }));
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
  });

  it('accepts status together with the existing tracker location callback', async () => {
    const response = responseDouble();
    const updateStatus = jest.fn();
    updateStatus.mockResolvedValue({ shipmentId: 'shipment-1', status: ShipmentStatus.OUT_FOR_DELIVERY });

    await updateTrackerIntegrationShipmentLocationController(jest.fn(), updateStatus)(
      { params: { externalOrderId: 'ORDER-123' }, body: { status: 'OUT_FOR_DELIVERY', description: 'Ready for delivery', currentLocation: { name: 'Accra hub', city: 'Accra', country: 'Ghana', latitude: 5.6037, longitude: -0.187 } } } as any,
      response,
    );

    expect(updateStatus).toHaveBeenCalledWith('ORDER-123', expect.objectContaining({ status: ShipmentStatus.OUT_FOR_DELIVERY }));
  });

  it('rejects an incomplete delivery callback', async () => {
    expect(shipmentStatusUpdateSchema.safeParse({ status: 'DELIVERED' }).success).toBe(false);
  });

  it('accepts the E-commerce payload and normalizes package units', () => {
    const parsed = trackerIntegrationShipmentSchema.safeParse({
      ...validPayload,
      notifyStaff: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.package.weightUnit).toBe('KG');
      expect(parsed.data.package.dimensionUnit).toBe('CM');
      expect(parsed.data.notifyStaff).toBe(true);
    }
  });

  it.each([
    ['externalOrderId', { externalOrderId: undefined }],
    ['externalCustomerId', { externalCustomerId: undefined }],
    ['externalSellerId', { externalSellerId: undefined }],
    ['sender', { sender: { ...validPayload.sender, city: '' } }],
    [
      'recipient',
      { recipient: { ...validPayload.recipient, addressLine1: '' } },
    ],
    ['package weight', { package: { ...validPayload.package, weight: -1 } }],
    [
      'package dimensions',
      {
        package: {
          ...validPayload.package,
          dimensions: { ...validPayload.package.dimensions, height: -1 },
        },
      },
    ],
    ['carrier', { carrier: 'FedEx' }],
  ])('rejects an invalid %s', (_field, override) => {
    expect(
      trackerIntegrationShipmentSchema.safeParse({
        ...validPayload,
        ...override,
      }).success,
    ).toBe(false);
  });

  it('returns the stable 400 error envelope for invalid requests', async () => {
    const response = responseDouble();

    await createTrackerIntegrationShipmentController()(
      { body: { carrier: 'OherbTracker' } } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'INVALID_REQUEST' }),
      }),
    );
  });

  it('returns the stable success response contract', async () => {
    const response = responseDouble();
    const createShipment = jest.fn() as jest.MockedFunction<
      typeof createTrackerIntegrationShipment
    >;
    createShipment.mockResolvedValue({
      shipmentId: '507f1f77bcf86cd799439011',
      shipmentNumber: 'SHP-20260917-000001',
      trackingNumber: 'ST1234567890ABCDEF12GH',
      externalOrderId: 'ORDER-123',
      customerId: '507f1f77bcf86cd799439014',
      status: ShipmentStatus.LABEL_CREATED,
      package: {
        packageId: '507f1f77bcf86cd799439012',
        packageNumber: 'PKG-20260917-000001',
        label: {
          id: 'LBL-ST1234567890ABCDEF12GH',
          trackingNumber: 'ST1234567890ABCDEF12GH',
          format: 'PDF',
          url: '/api/v1/shipments/labels/ST1234567890ABCDEF12GH',
        },
      },
    });

    await createTrackerIntegrationShipmentController(createShipment)(
      { body: validPayload } as any,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        shipmentId: '507f1f77bcf86cd799439011',
        shipmentNumber: 'SHP-20260917-000001',
        trackingNumber: 'ST1234567890ABCDEF12GH',
        externalOrderId: 'ORDER-123',
        customerId: '507f1f77bcf86cd799439014',
        status: 'LABEL_CREATED',
        package: {
          packageId: '507f1f77bcf86cd799439012',
          packageNumber: 'PKG-20260917-000001',
          label: expect.objectContaining({
            id: 'LBL-ST1234567890ABCDEF12GH',
            format: 'PDF',
          }),
        },
      }),
    });
  });
});
