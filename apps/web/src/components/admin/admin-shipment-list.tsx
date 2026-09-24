'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminAccess } from './admin-access';
import { listShipments, type Shipment, type ShipmentListQuery } from '../../lib/api-client';
import { PageContainer } from '../layout/page-container';
import { ErrorCard } from '../ui/errors';
import { PageLoading } from '../ui/loading';
import { ShipmentStatusBadge } from '../ui/status-badge';
import { ServiceTypeBadge } from '../ui/service-type-badge';
import { Input, Select } from '../ui/forms';

const statuses = ['CREATED', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'DEPARTED_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED', 'RETURNED'];

export function AdminShipmentList({ initialQuery }: { initialQuery: ShipmentListQuery }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pagination, setPagination] = useState({ page: initialQuery.page ?? 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    listShipments({ ...query, limit: 20 })
      .then((response) => {
        if (!active) return;
        setShipments(response.shipments ?? []);
        setPagination({
          page: Number(response.pagination?.page) || 1,
          limit: Number(response.pagination?.limit) || 20,
          total: Number(response.pagination?.total) || 0,
          totalPages: Number(response.pagination?.totalPages) || 0,
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load shipments.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  function updateQuery(next: Partial<ShipmentListQuery>) {
    const nextQuery = { ...query, ...next, page: next.page ?? 1 };
    setQuery(nextQuery);
    const params = new URLSearchParams();
    if (nextQuery.search) params.set('search', nextQuery.search);
    if (nextQuery.status) params.set('status', nextQuery.status);
    if (nextQuery.serviceType) params.set('serviceType', nextQuery.serviceType);
    if (nextQuery.sortBy) params.set('sortBy', nextQuery.sortBy);
    if (nextQuery.sortOrder) params.set('sortOrder', nextQuery.sortOrder);
    params.set('page', String(nextQuery.page));
    router.push(`/admin/shipments?${params.toString()}`);
  }

  return (
    <AdminAccess>
      <PageContainer className="admin-page">
        <div className="admin-page-heading shipments-heading">
          <div>
            <div className="admin-heading-kicker"><span className="admin-live-dot" /> Operations / Shipments</div>
            <h1>Shipment control center</h1>
            <p className="muted-copy">Search, review, and manage every shipment in one place.</p>
          </div>
          <div className="admin-heading-actions">
            <Link className="back-link" href="/admin">Operations Dashboard</Link>
            <Link className="form-button admin-primary-action" href="/admin/shipments/create"><span aria-hidden="true">+</span> Create shipment</Link>
          </div>
        </div>
        <div className="shipment-summary-strip" aria-label="Shipment summary">
          <div><span className="shipment-summary-label">Showing</span><strong>{(Number(pagination.total) || 0).toLocaleString()}</strong><span>shipments</span></div>
          <div><span className="shipment-summary-label">Current view</span><strong>{query.status || 'All statuses'}</strong></div>
          <div><span className="shipment-summary-label">Last sorted</span><strong>{query.sortOrder === 'asc' ? 'Oldest first' : 'Newest first'}</strong></div>
        </div>
        <section className="admin-filter-panel shipment-filter-panel" aria-label="Shipment filters">
          <label className="shipment-search-field"><span>Find a shipment</span><Input value={query.search ?? ''} onChange={(event) => setQuery({ ...query, search: event.target.value })} placeholder="Tracking number or customer" aria-label="Search shipments" /></label>
          <label><span>Status</span><Select value={query.status ?? ''} onChange={(event) => updateQuery({ status: event.target.value })} aria-label="Filter by status"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</Select></label>
          <label><span>Service</span><Select value={query.serviceType ?? ''} onChange={(event) => updateQuery({ serviceType: event.target.value })} aria-label="Filter by service"><option value="">All services</option><option value="STANDARD">Standard</option><option value="EXPRESS">Express</option><option value="OVERNIGHT">Overnight</option></Select></label>
          <label><span>Sort by</span><Select value={`${query.sortBy ?? 'createdAt'}:${query.sortOrder ?? 'desc'}`} onChange={(event) => { const [sortBy, sortOrder] = event.target.value.split(':'); updateQuery({ sortBy, sortOrder }); }} aria-label="Sort shipments"><option value="createdAt:desc">Newest</option><option value="createdAt:asc">Oldest</option><option value="updatedAt:desc">Recently updated</option></Select></label>
          <div className="shipment-filter-actions"><button className="form-button" type="button" onClick={() => updateQuery({ search: query.search })}>Apply filters</button><button className="form-button muted-button" type="button" onClick={() => updateQuery({ search: '', status: '', serviceType: '', sortBy: 'createdAt', sortOrder: 'desc' })}>Reset</button></div>
        </section>
        {error ? <ErrorCard title="Unable to load shipments" message={error} /> : null}
        {loading ? <PageLoading /> : shipments.length === 0 ? <section className="empty-state"><h2>No shipments found</h2><p>{query.search || query.status || query.serviceType ? 'Try adjusting your search or filters.' : 'There are currently no shipments to display.'}</p></section> : (
          <section className="admin-shipment-table" aria-label="Shipments">
            <div className="admin-table-header"><span>Shipment</span><span>Customer</span><span>Status</span><span>Service</span><span>Destination</span><span>Created</span><span>Actions</span></div>
            {shipments.map((shipment) => <article className="admin-table-row" key={shipment.id}>
              <span><Link className="shipment-link" href={`/admin/shipments/${shipment.id}`}>{shipment.trackingNumber}</Link><small className="shipment-row-caption">Open shipment record</small></span>
              <span>{shipment.customer?.name ?? shipment.customer?.email ?? 'Customer unavailable'}</span>
              <span><ShipmentStatusBadge status={shipment.status} /></span>
              <span><ServiceTypeBadge type={shipment.serviceType} /></span>
              <span>{shipment.destination?.city ?? shipment.destination?.country ?? 'Unavailable'}</span>
              <span className="shipment-date">{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'Unknown'}</span>
              <Link className="shipment-view-action" href={`/admin/shipments/${shipment.id}`}>View <span aria-hidden="true">-&gt;</span></Link>
            </article>)}
          </section>
        )}
        <nav className="pagination" aria-label="Shipment pagination">
          <button className="form-button muted-button" disabled={loading || (pagination.page ?? 1) <= 1} onClick={() => updateQuery({ page: (pagination.page ?? 1) - 1 })}>Previous</button>
          <span>Page {pagination.page ?? 1} of {Math.max(pagination.totalPages, 1)}</span>
          <button className="form-button muted-button" disabled={loading || (pagination.page ?? 1) >= pagination.totalPages} onClick={() => updateQuery({ page: (pagination.page ?? 1) + 1 })}>Next</button>
        </nav>
      </PageContainer>
    </AdminAccess>
  );
}
