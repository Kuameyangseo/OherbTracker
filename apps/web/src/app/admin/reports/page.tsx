import { AdminReports } from '../../../components/admin/admin-reports';
import { OperationalReportType } from '@oherb-tracker/shared-types';
import type { ReportQuery, ServiceType, ShipmentStatus } from '../../../lib/api-client';

const reportTypes = new Set<OperationalReportType>([
  OperationalReportType.SHIPMENT,
  OperationalReportType.DELIVERY_PERFORMANCE,
  OperationalReportType.EXCEPTION,
]);

export default async function AdminReportsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const reportType = first(params?.reportType);
  const initialQuery: ReportQuery = {
    reportType: reportTypes.has(reportType as OperationalReportType) ? reportType as OperationalReportType : OperationalReportType.SHIPMENT,
    from: first(params?.from),
    to: first(params?.to),
    status: ['CREATED', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'DEPARTED_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED', 'RETURNED'].includes(first(params?.status) ?? '') ? first(params?.status) as ShipmentStatus : undefined,
    serviceType: ['STANDARD', 'EXPRESS', 'OVERNIGHT'].includes(first(params?.serviceType) ?? '') ? first(params?.serviceType) as ServiceType : undefined,
    search: first(params?.search),
    page: Number(first(params?.page)) > 0 ? Number(first(params?.page)) : 1,
  };
  return (
    <AdminReports
      initialQuery={initialQuery}
    />
  );
}
