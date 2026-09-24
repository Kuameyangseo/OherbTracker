import type { Request, Response } from 'express';
import {
  trackerIntegrationShipmentSchema,
  shipmentStatusUpdateSchema,
  trackingNumberSchema,
} from '@oherb-tracker/validation';
import {
  createTrackerIntegrationShipment,
  getTrackerIntegrationShipmentByOrder,
  getTrackerIntegrationShipmentByTrackingNumber,
  updateTrackerIntegrationShipmentLocation,
} from '../services/tracker-integration.service.js';
import {
  getPublicTracking,
  updateShipmentStatusByExternalOrder,
} from '../services/tracking.service.js';

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
    if (!shipment) {
      return response.status(404).json({
        success: false,
        error: {
          code: 'SHIPMENT_NOT_FOUND',
          message: 'Shipment not found for this order.',
        },
      });
    }
    return response.status(200).json({ success: true, data: shipment });
  };
}

export function getTrackerIntegrationShipmentByTrackingNumberController() {
  return async function trackerIntegrationShipmentByTrackingNumberHandler(request: Request, response: Response) {
    const trackingNumber = String(request.params.trackingNumber || '').trim();
    const shipment = await getTrackerIntegrationShipmentByTrackingNumber(trackingNumber);
    if (!shipment) return response.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Tracker label not found.' } });
    return response.status(200).json({ success: true, data: shipment });
  };
}

export function updateTrackerIntegrationShipmentLocationController(
  updateLocation = updateTrackerIntegrationShipmentLocation,
  updateStatus = updateShipmentStatusByExternalOrder,
) {
  return async function updateTrackerIntegrationShipmentLocationHandler(request: Request, response: Response) {
    const { currentLocation, status, description, timestamp } = request.body || {};
    if (!currentLocation || !Number.isFinite(Number(currentLocation.latitude)) || !Number.isFinite(Number(currentLocation.longitude))) {
      return response.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid shipment coordinates are required.' } });
    }
    const externalOrderId = String(request.params.externalOrderId || '').trim();
    const location = {
      name: String(currentLocation.name || 'Current location'),
      city: String(currentLocation.city || 'Current location'),
      country: String(currentLocation.country || 'Ghana'),
      latitude: Number(currentLocation.latitude),
      longitude: Number(currentLocation.longitude),
    };
    if (status !== undefined) {
      const parsedStatus = shipmentStatusUpdateSchema.safeParse({
        status,
        description: String(description || `Shipment status updated to ${String(status).replaceAll('_', ' ').toLowerCase()}.`),
        location: location.name,
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        ...(timestamp !== undefined ? { timestamp } : {}),
      });
      if (!parsedStatus.success) {
        return response.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS_UPDATE', message: 'Invalid shipment status update.', details: validationDetails(parsedStatus.error) },
        });
      }
      const data = await updateStatus(externalOrderId, parsedStatus.data);
      return response.status(200).json({ success: true, data });
    }

    const shipment = await updateLocation(externalOrderId, location);
    if (!shipment) return response.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Tracker shipment not found.' } });
    return response.status(200).json({ success: true, data: shipment });
  };
}

export function updateTrackerIntegrationShipmentStatusController(
  updateStatus = updateShipmentStatusByExternalOrder,
) {
  return async function updateTrackerIntegrationShipmentStatusHandler(
    request: Request,
    response: Response,
  ) {
    const parsed = shipmentStatusUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_UPDATE',
          message: 'Invalid shipment status update.',
          details: validationDetails(parsed.error),
        },
      });
    }

    const externalOrderId = String(request.params.externalOrderId || '').trim();
    if (!externalOrderId) {
      return response.status(404).json({
        success: false,
        error: { code: 'SHIPMENT_NOT_FOUND', message: 'Tracker shipment not found.' },
      });
    }

    const data = await updateStatus(externalOrderId, parsed.data);
    return response.status(200).json({ success: true, data });
  };
}
