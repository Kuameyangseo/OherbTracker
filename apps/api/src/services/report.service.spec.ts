import { describe, expect, it } from '@jest/globals';
import { OperationalReportType, ServiceType, ShipmentStatus } from '@oherb-tracker/shared-types';
import { operationalReportQuerySchema } from '@oherb-tracker/validation';
import { buildReportFilter, createReportCsv, reportFilename, resolveReportDates } from './report.service.js';

describe('operational reports', () => {
  it('reuses inclusive date-only start and exclusive end semantics', () => {
    const parsed = operationalReportQuerySchema.parse({ reportType: OperationalReportType.SHIPMENT, from: '2026-09-01', to: '2026-09-14' });
    const dates = resolveReportDates(parsed);
    expect(dates.from?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(dates.to?.toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('validates report type and filter bounds', () => {
    expect(operationalReportQuerySchema.safeParse({ reportType: 'unknown' }).success).toBe(false);
    expect(operationalReportQuerySchema.safeParse({ reportType: OperationalReportType.SHIPMENT, limit: 101 }).success).toBe(false);
    expect(operationalReportQuerySchema.safeParse({ reportType: OperationalReportType.EXCEPTION, search: '  tracking ' }).success).toBe(true);
  });

  it('applies status, service, search-safe date, and exception filters server-side', async () => {
    const filter = await buildReportFilter(operationalReportQuerySchema.parse({
      reportType: OperationalReportType.SHIPMENT,
      from: '2026-09-01',
      to: '2026-09-14',
      status: ShipmentStatus.IN_TRANSIT,
      serviceType: ServiceType.EXPRESS,
    }));
    expect(filter).toMatchObject({
      status: ShipmentStatus.IN_TRANSIT,
      serviceType: ServiceType.EXPRESS,
      createdAt: { $gte: new Date('2026-09-01T00:00:00.000Z'), $lt: new Date('2026-09-15T00:00:00.000Z') },
    });
    const exceptionFilter = await buildReportFilter(operationalReportQuerySchema.parse({ reportType: OperationalReportType.EXCEPTION }));
    expect(exceptionFilter).toEqual({ status: ShipmentStatus.EXCEPTION });
  });

  it('escapes CSV cells and neutralizes formula values', () => {
    const csv = createReportCsv(OperationalReportType.SHIPMENT, [{
      trackingNumber: '=HYPERLINK("https://evil.example")',
      status: ShipmentStatus.EXCEPTION,
      serviceType: ServiceType.STANDARD,
      createdAt: '2026-09-14T00:00:00.000Z',
      estimatedDelivery: null,
      actualDelivery: null,
    }]);
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.example"")"`);
    expect(reportFilename(OperationalReportType.EXCEPTION, new Date('2026-09-14T00:00:00.000Z'))).toBe('oherb-exception-report-2026-09-14.csv');
  });
});
