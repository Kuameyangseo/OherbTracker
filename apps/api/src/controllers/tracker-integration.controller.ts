import type { Request, Response } from 'express';
import {
  trackerIntegrationShipmentSchema,
  trackingNumberSchema,
} from '@oherb-tracker/validation';
import {
  createTrackerIntegrationShipment,
  getTrackerIntegrationShipmentByOrder,
} from '../services/tracker-integration.service.js';
import { getPublicTracking } from '../services/tracking.service.js';

function validationDetails(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      issue.path.map(String).join('.') || 'request',
      issue.message,
    ]),
  );
}

export function getPublicTrackingController(
  lookup: typeof getPublicTracking = getPublicTracking,
) {
  return async function publicTrackingHandler(
    request: Request,
    response: Response,
  ) {
    const parsed = trackingNumberSchema.safeParse(request.params.trackingNumber);
    if (!parsed.success) {
      return response.status(404).json({
        success: false,
        error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' },
      });
    }

    const data = await lookup(parsed.data);
    return response.status(200).json({ success: true, data });
  };
}

export function createTrackerIntegrationShipmentController(
  createShipment = createTrackerIntegrationShipment,
) {
  return async function trackerIntegrationShipmentHandler(
    request: Request,
    response: Response,
  ) {
    const parsed = trackerIntegrationShipmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid shipment request.',
          details: validationDetails(parsed.error),
        },
      });
    }

    const shipment = await createShipment(parsed.data);
    return response.status(201).json({ success: true, data: shipment });
  };
}

export function getTrackerIntegrationShipmentByOrderController(
  lookup = getTrackerIntegrationShipmentByOrder,
) {
  return async function trackerIntegrationShipmentByOrderHandler(
    request: Request,
    response: Response,
  ) {
    const externalOrderId = String(request.params.externalOrderId || '').trim();
    if (!externalOrderId) {
      return response.status(404).json({
        success: false,
        error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' },
      });
    }

    const shipment = await lookup(externalOrderId);
    return response.status(200).json({ success: true, data: shipment });
  };
}
