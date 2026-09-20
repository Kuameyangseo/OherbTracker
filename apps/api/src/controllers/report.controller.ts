import type { Request, Response } from 'express';
import { OperationalReportType } from '@oherb-tracker/shared-types';
import { operationalReportQuerySchema } from '@oherb-tracker/validation';
import { createReportCsv, getReportExportRows, getReportPreview, reportFilename, ReportError } from '../services/report.service.js';

function validationDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.map(String).join('.') || 'request', issue.message]));
}

function parseQuery(request: Request) {
  const requestedType = request.params.reportType ?? request.query.reportType ?? request.query.type ?? request.query.report;
  const reportType = typeof requestedType === 'string'
    ? ({ shipments: OperationalReportType.SHIPMENT, exceptions: OperationalReportType.EXCEPTION, 'delivery-performance': OperationalReportType.DELIVERY_PERFORMANCE }[requestedType] ?? requestedType)
    : requestedType;
  return operationalReportQuerySchema.safeParse({ ...request.query, reportType });
}

export async function getReportPreviewController(request: Request, response: Response) {
  const parsed = parseQuery(request);
  if (!parsed.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid report filters.', details: validationDetails(parsed.error) },
    });
  }
  const data = await getReportPreview(parsed.data);
  return response.status(200).json({ success: true, data });
}

export async function exportReportController(request: Request, response: Response) {
  const parsed = parseQuery(request);
  if (!parsed.success) {
    return response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid report filters.', details: validationDetails(parsed.error) },
    });
  }

  try {
    const rows = await getReportExportRows(parsed.data);
    const csv = createReportCsv(parsed.data.reportType, rows);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${reportFilename(parsed.data.reportType)}"`);
    return response.status(200).send(csv);
  } catch (error) {
    if (error instanceof ReportError) {
      return response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    }
    throw error;
  }
}
