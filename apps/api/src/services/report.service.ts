import { Shipment, User, type ShipmentDocument } from '@oherb-tracker/database';
import { OperationalReportType, ServiceType, ShipmentStatus, type DeliveryPerformanceReportRow, type ExceptionReportRow, type OperationalReportPreview, type OperationalReportRow, type ShipmentReportRow } from '@oherb-tracker/shared-types';
import type { OperationalReportQuery } from '@oherb-tracker/validation';
import type { QueryFilter } from 'mongoose';

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_REPORT_EXPORT_ROWS = 10_000;
export const MAX_REPORT_EXPORT_BYTES = 5 * 1024 * 1024;

type ReportRecord = Pick<ShipmentDocument, 'trackingNumber' | 'status' | 'serviceType' | 'createdAt' | 'updatedAt' | 'estimatedDelivery' | 'actualDelivery'> & {
  _id: unknown;
};
type ShipmentFilter = QueryFilter<ShipmentDocument>;

export class ReportError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'ReportError';
  }
}

export type ResolvedReportDates = { from?: Date; to?: Date };

function isMidnight(value: Date): boolean {
  return value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0 && value.getUTCMilliseconds() === 0;
}

export function resolveReportDates(input: Pick<OperationalReportQuery, 'from' | 'to'>): ResolvedReportDates {
  const from = input.from ? new Date(input.from) : undefined;
  let to = input.to ? new Date(input.to) : undefined;
  if (to && isMidnight(to)) to = new Date(to.getTime() + DAY_MS);
  return { from, to };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function buildReportFilter(query: OperationalReportQuery): Promise<ShipmentFilter> {
  const filter: ShipmentFilter = {};
  if (query.reportType === OperationalReportType.EXCEPTION) {
    filter.status = ShipmentStatus.EXCEPTION;
  } else if (query.status) {
    filter.status = query.status;
  }
  if (query.serviceType) filter.serviceType = query.serviceType;

  const dates = resolveReportDates(query);
  if (dates.from || dates.to) {
    filter.createdAt = {
      ...(dates.from ? { $gte: dates.from } : {}),
      ...(dates.to ? { $lt: dates.to } : {}),
    };
  }

  if (query.search) {
    const expression = new RegExp(escapeRegex(query.search), 'i');
    const matchingCustomers = await User.find({ $or: [{ email: expression }, { name: expression }] }).select('_id').lean();
    filter.$or = [
      { trackingNumber: expression },
      { customerId: { $in: matchingCustomers.map((customer) => customer._id) } },
    ];
  }
  return filter;
}

function iso(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function baseRow(record: ReportRecord): ShipmentReportRow {
  return {
    trackingNumber: record.trackingNumber,
    status: record.status as ShipmentStatus,
    serviceType: record.serviceType as ServiceType,
    createdAt: new Date(record.createdAt).toISOString(),
    estimatedDelivery: iso(record.estimatedDelivery),
    actualDelivery: iso(record.actualDelivery),
  };
}

function reportRow(record: ReportRecord, reportType: OperationalReportType): OperationalReportRow {
  const row = baseRow(record);
  if (reportType === OperationalReportType.DELIVERY_PERFORMANCE) {
    const deliveryDays = record.actualDelivery
      ? (new Date(record.actualDelivery).getTime() - new Date(record.createdAt).getTime()) / DAY_MS
      : null;
    const delayDays = record.actualDelivery && record.estimatedDelivery
      ? (new Date(record.actualDelivery).getTime() - new Date(record.estimatedDelivery).getTime()) / DAY_MS
      : null;
    const result: DeliveryPerformanceReportRow = {
      ...row,
      deliveryDays: deliveryDays === null ? null : Math.round(deliveryDays * 100) / 100,
      delayDays: delayDays === null ? null : Math.round(delayDays * 100) / 100,
      onTime: delayDays === null ? null : delayDays <= 0,
    };
    return result;
  }
  if (reportType === OperationalReportType.EXCEPTION) {
    const result: ExceptionReportRow = { ...row, updatedAt: new Date(record.updatedAt).toISOString() };
    return result;
  }
  return row;
}

async function findReportRecords(query: OperationalReportQuery, exportRows: boolean): Promise<{ records: ReportRecord[]; total: number }> {
  const filter = await buildReportFilter(query);
  const total = await Shipment.countDocuments(filter);
  if (exportRows && total > MAX_REPORT_EXPORT_ROWS) {
    throw new ReportError(413, 'REPORT_EXPORT_TOO_LARGE', `Exports are limited to ${MAX_REPORT_EXPORT_ROWS.toLocaleString()} rows.`);
  }

  const records = (await Shipment.find(filter)
    .sort({ createdAt: -1 })
    .skip(exportRows ? 0 : (query.page - 1) * query.limit)
    .limit(exportRows ? MAX_REPORT_EXPORT_ROWS : query.limit)
    .lean()) as unknown as ReportRecord[];
  return { records, total };
}

export async function getReportPreview(query: OperationalReportQuery): Promise<OperationalReportPreview> {
  const { records, total } = await findReportRecords(query, false);
  return {
    reportType: query.reportType,
    generatedAt: new Date().toISOString(),
    filters: {
      reportType: query.reportType,
      from: query.from?.toISOString(),
      to: query.to?.toISOString(),
      status: query.status,
      serviceType: query.serviceType,
      search: query.search,
      page: query.page,
      limit: query.limit,
    },
    rows: records.map((record) => reportRow(record, query.reportType)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function getReportExportRows(query: OperationalReportQuery): Promise<OperationalReportRow[]> {
  const { records } = await findReportRecords(query, true);
  return records.map((record) => reportRow(record, query.reportType));
}

function csvValue(value: string | number | boolean | null): string {
  const text = value === null ? '' : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function rowValues(row: OperationalReportRow, reportType: OperationalReportType): Array<string | number | boolean | null> {
  const common = [row.trackingNumber, row.status, row.serviceType, row.createdAt, row.estimatedDelivery, row.actualDelivery];
  if (reportType === OperationalReportType.DELIVERY_PERFORMANCE) {
    const performance = row as DeliveryPerformanceReportRow;
    return [...common, performance.deliveryDays, performance.delayDays, performance.onTime];
  }
  if (reportType === OperationalReportType.EXCEPTION) return [...common, (row as ExceptionReportRow).updatedAt];
  return common;
}

export function reportCsvHeader(reportType: OperationalReportType): string {
  if (reportType === OperationalReportType.DELIVERY_PERFORMANCE) return 'Tracking Number,Status,Service Type,Created At,Estimated Delivery,Actual Delivery,Delivery Days,Delay Days,On Time';
  if (reportType === OperationalReportType.EXCEPTION) return 'Tracking Number,Status,Service Type,Created At,Estimated Delivery,Actual Delivery,Updated At';
  return 'Tracking Number,Status,Service Type,Created At,Estimated Delivery,Actual Delivery';
}

export function createReportCsv(reportType: OperationalReportType, rows: OperationalReportRow[]): string {
  const lines = [reportCsvHeader(reportType), ...rows.map((row) => rowValues(row, reportType).map(csvValue).join(','))];
  const csv = `${lines.join('\r\n')}\r\n`;
  if (Buffer.byteLength(csv, 'utf8') > MAX_REPORT_EXPORT_BYTES) {
    throw new ReportError(413, 'REPORT_EXPORT_TOO_LARGE', 'The report exceeds the maximum export size.');
  }
  return csv;
}

export function reportFilename(reportType: OperationalReportType, now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const safeType = String(reportType).replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'report';
  return `oherb-${safeType}-report-${date}.csv`;
}
