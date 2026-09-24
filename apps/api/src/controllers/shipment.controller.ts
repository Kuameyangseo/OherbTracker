import type { Request, Response } from 'express';
import {
  shipmentCreateSchema,
  shipmentIdSchema,
  shipmentQuerySchema,
  shipmentUpdateSchema,
} from '@oherb-tracker/validation';
import {
  createShipment,
  deleteShipment,
  getShipmentById,
  listCustomers,
  listShipments,
  updateShipment,
} from '../services/shipment.service.js';

function validationDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.map(String).join('.') || 'request', issue.message]));
}

export async function createShipmentController(request: Request, response: Response) {
  const parsed = shipmentCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid shipment data.', details: validationDetails(parsed.error) },
    });
  }

  const shipment = await createShipment(parsed.data);
  return response.status(201).json({ success: true, data: { shipment } });
}

export async function listShipmentsController(request: Request, response: Response) {
  const parsed = shipmentQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid shipment query.', details: validationDetails(parsed.error) },
    });
  }

  const data = await listShipments(parsed.data, request.user!);
  return response.status(200).json({ success: true, data });
}

export async function listCustomersController(request: Request, response: Response) {
  const search = typeof request.query.search === 'string' ? request.query.search : '';
  const customers = await listCustomers(search);
  return response.status(200).json({ success: true, data: { customers } });
}

export async function getShipmentController(request: Request, response: Response) {
  const parsed = shipmentIdSchema.safeParse(request.params.id);
  if (!parsed.success) {
    return response.status(404).json({
      success: false,
      error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' },
    });
  }

  const shipment = await getShipmentById(parsed.data, request.user!);
  return response.status(200).json({ success: true, data: { shipment } });
}

export async function updateShipmentController(request: Request, response: Response) {
  const id = shipmentIdSchema.safeParse(request.params.id);
  const body = shipmentUpdateSchema.safeParse(request.body);
  if (!id.success) {
    return response.status(404).json({
      success: false,
      error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' },
    });
  }
  if (!body.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid shipment update.', details: validationDetails(body.error) },
    });
  }

  const shipment = await updateShipment(id.data, body.data);
  return response.status(200).json({ success: true, data: { shipment } });
}

export async function deleteShipmentController(request: Request, response: Response) {
  const id = shipmentIdSchema.safeParse(request.params.id);
  if (!id.success) {
    return response.status(404).json({
      success: false,
      error: { code: 'SHIPMENT_NOT_FOUND', message: 'Shipment not found.' },
    });
  }

  await deleteShipment(id.data);
  return response.status(200).json({ success: true, data: { deleted: true } });
}
