'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { OperationalReportPreview, OperationalReportRow, OperationalReportType } from '@oherb-tracker/shared-types';
import { downloadReportCsv, getReportPreview, type ReportQuery, type ServiceType, type ShipmentStatus } from '../../lib/api-client';
import { AdminAccess } from './admin-access';
import { PageContainer } from '../layout/page-container';
import { EmptyState } from '../ui/empty-state';
import { ErrorCard } from '../ui/errors';
import { PageLoading } from '../ui/loading';

const reportOptions = [
  { value: 'shipment' as OperationalReportType, label: 'Shipment report' },
  { value: 'delivery-performance' as OperationalReportType, label: 'Delivery performance' },
  { value: 'exception' as OperationalReportType, label: 'Exception report' },
] as const;
const statusOptions: ShipmentStatus[] = ['CREATED', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'DEPARTED_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED', 'RETURNED'];
const serviceOptions: ServiceType[] = ['STANDARD', 'EXPRESS', 'OVERNIGHT'];

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function rowValue(row: OperationalReportRow, key: string): string {
  const values = row as unknown as Record<string, string | number | boolean | null | undefined>;
  const value = values[key];
  if (value === null || value === undefined) return '—';
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
}

export function AdminReports({ initialQuery }: { initialQuery: ReportQuery }) {
  const [query, setQuery] = useState<ReportQuery>({ page: 1, limit: 20, ...initialQuery });
  const [data, setData] = useState<OperationalReportPreview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getReportPreview(query)
      .then((response) => { if (active) setData(response); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load report.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryKey, query]);

  function updateQuery(next: Partial<ReportQuery>) {
    const nextQuery = { ...query, ...next, page: next.page ?? 1 };
    setQuery(nextQuery);
    const params = new URLSearchParams({ reportType: nextQuery.reportType });
    for (const [key, value] of Object.entries(nextQuery)) {
      if (key !== 'reportType' && value !== undefined && value !== '') params.set(key, String(value));
    }
    window.history.replaceState(null, '', `/admin/reports?${params.toString()}`);
  }

  async function exportReport() {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    try {
      await downloadReportCsv({ ...query, page: undefined, limit: undefined });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to export report.');
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }

  const reportType = query.reportType;
  return (
    <AdminAccess>
      <PageContainer className="admin-page">
        <div className="admin-page-heading">
          <div><span className="section-kicker">Internal Operations</span><h1>Operational reports</h1><p className="muted-copy">Preview and export staff-only shipment reports.</p></div>
          <div className="analytics-heading-actions"><button className="form-button" type="button" onClick={exportReport} disabled={exporting || loading}>{exporting ? 'Exporting…' : 'Export CSV'}</button><Link className="back-link" href="/admin">Operations Dashboard</Link></div>
        </div>

        <section className="analytics-filter-panel" aria-label="Report filters">
          <label className="form-label" htmlFor="report-type">Report type</label>
          <select id="report-type" value={reportType} onChange={(event) => updateQuery({ reportType: event.target.value as OperationalReportType })}>{reportOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
          <label className="form-label" htmlFor="report-from">From</label><input id="report-from" type="date" value={query.from ?? ''} onChange={(event) => updateQuery({ from: event.target.value || undefined })} />
          <label className="form-label" htmlFor="report-to">To</label><input id="report-to" type="date" value={query.to ?? ''} onChange={(event) => updateQuery({ to: event.target.value || undefined })} />
          <label className="form-label" htmlFor="report-status">Status</label>
          <select id="report-status" value={query.status ?? ''} onChange={(event) => updateQuery({ status: (event.target.value || undefined) as ShipmentStatus | undefined })}><option value="">All statuses</option>{statusOptions.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select>
          <label className="form-label" htmlFor="report-service">Service</label>
          <select id="report-service" value={query.serviceType ?? ''} onChange={(event) => updateQuery({ serviceType: (event.target.value || undefined) as ServiceType | undefined })}><option value="">All services</option>{serviceOptions.map((service) => <option value={service} key={service}>{service}</option>)}</select>
          <label className="form-label" htmlFor="report-search">Search</label><input id="report-search" type="search" maxLength={120} value={query.search ?? ''} onChange={(event) => updateQuery({ search: event.target.value || undefined })} placeholder="Tracking number or customer" />
        </section>

        {loading ? <PageLoading /> : error ? <section><ErrorCard title="Unable to load report" message={error} /><button className="form-button" type="button" onClick={() => updateQuery({})}>Try again</button></section> : !data || data.rows.length === 0 ? <EmptyState title="No report results" description="Try changing the filters to find matching shipments." /> : (
          <>
            <section className="analytics-card report-summary" aria-label="Report summary">
              <h2>Report summary</h2>
              <p aria-live="polite">Showing {data.rows.length} of {data.pagination.total} results.</p>
              <p>Generated {new Date(data.generatedAt).toLocaleString()}</p>
            </section>
            <section className="analytics-card analytics-table-wrap">
              <table><caption className="sr-only">{reportType} report preview</caption><thead><tr><th scope="col">Tracking number</th><th scope="col">Status</th><th scope="col">Service</th><th scope="col">Created</th><th scope="col">Estimated delivery</th><th scope="col">Actual delivery</th>{reportType === 'delivery-performance' ? <><th scope="col">Delivery days</th><th scope="col">Delay days</th><th scope="col">On time</th></> : reportType === 'exception' ? <th scope="col">Updated</th> : null}</tr></thead><tbody>{data.rows.map((row) => <tr key={`${row.trackingNumber}-${row.createdAt}`}><th scope="row">{row.trackingNumber}</th><td>{row.status}</td><td>{row.serviceType}</td><td>{displayDate(row.createdAt)}</td><td>{displayDate(row.estimatedDelivery)}</td><td>{displayDate(row.actualDelivery)}</td>{reportType === 'delivery-performance' ? <><td>{rowValue(row, 'deliveryDays')}</td><td>{rowValue(row, 'delayDays')}</td><td>{rowValue(row, 'onTime')}</td></> : reportType === 'exception' ? <td>{rowValue(row, 'updatedAt')}</td> : null}</tr>)}</tbody></table>
            </section>
            <div className="analytics-heading-actions"><button className="form-button" type="button" disabled={query.page === 1} onClick={() => updateQuery({ page: (query.page ?? 1) - 1 })}>Previous</button><span>Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}</span><button className="form-button" type="button" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => updateQuery({ page: (query.page ?? 1) + 1 })}>Next</button></div>
          </>
        )}
      </PageContainer>
    </AdminAccess>
  );
}
