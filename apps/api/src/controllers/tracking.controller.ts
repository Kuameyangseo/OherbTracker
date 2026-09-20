import type { Request, Response } from 'express';
import { shipmentIdSchema, shipmentStatusUpdateSchema, trackingEventSchema, trackingNumberSchema } from '@oherb-tracker/validation';
import {
  createTrackingEvent,
  getPublicTracking,
  getShipmentEvents,
  updateShipmentStatus,
} from '../services/tracking.service.js';

function validationDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.map(String).join('.') || 'request', issue.message]));
}

export async function getPublicTrackingController(request: Request, response: Response) {
  const parsed = trackingNumberSchema.safeParse(request.params.trackingNumber);
  if (!parsed.success) {
    return response.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' } });
  }

  const data = await getPublicTracking(parsed.data);
  return response.status(200).json({ success: true, data });
}

export async function getShipmentEventsController(request: Request, response: Response) {
  const parsed = shipmentIdSchema.safeParse(request.params.id);
  if (!parsed.success) {
    return response.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' } });
  }

  const data = await getShipmentEvents(parsed.data, request.user!);
  return response.status(200).json({ success: true, data });
}

export async function createTrackingEventController(request: Request, response: Response) {
  const id = shipmentIdSchema.safeParse(request.params.id);
  const body = trackingEventSchema.safeParse(request.body);
  if (!id.success) {
    return response.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' } });
  }
  if (!body.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid tracking event.', details: validationDetails(body.error) },
    });
  }

  const data = await createTrackingEvent(id.data, body.data, request.user!);
  return response.status(201).json({ success: true, data });
}

export async function updateShipmentStatusController(request: Request, response: Response) {
  const id = shipmentIdSchema.safeParse(request.params.id);
  const body = shipmentStatusUpdateSchema.safeParse(request.body);
  if (!id.success) {
    return response.status(404).json({ success: false, error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' } });
  }
  if (!body.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid shipment status update.', details: validationDetails(body.error) },
    });
  }

  const data = await updateShipmentStatus(id.data, body.data, request.user!);
  return response.status(200).json({ success: true, data });
}
