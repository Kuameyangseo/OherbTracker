'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageContainer } from '../layout/page-container';
import { ErrorCard, UnauthorizedState } from '../ui/errors';
import { PageLoading } from '../ui/loading';
import { ShipmentStatusBadge } from '../ui/status-badge';
import { ServiceTypeBadge } from '../ui/service-type-badge';
import { ApiError, type Shipment, listShipments } from '../../lib/api-client';
import { useAuth } from '../auth/auth-context';

export type ShipmentListQuery = {
  search?: string;
  status?: string;
  serviceType?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
};

export function ShipmentListPageContent({ initialQuery }: { initialQuery: ShipmentListQuery }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pagination, setPagination] = useState({ page: initialQuery.page ?? 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(initialQuery.search ?? '');
  const [search, setSearch] = useState(initialQuery.search ?? '');
  const [status, setStatus] = useState(initialQuery.status ?? '');
  const [serviceType, setServiceType] = useState(initialQuery.serviceType ?? '');
  const [sortBy, setSortBy] = useState(initialQuery.sortBy ?? 'createdAt');
  const [sortOrder, setSortOrder] = useState(initialQuery.sortOrder ?? 'desc');
  const [page, setPage] = useState(initialQuery.page ?? 1);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let active = true;
    async function loadShipments() {
      setLoading(true);
      setError('');
      try {
        const payload = await listShipments({
          page,
          limit: 10,
          search,
          status,
          serviceType,
          sortBy,
          sortOrder,
        });
        if (!active) return;
        setShipments(payload.shipments ?? []);
        setPagination(payload.pagination);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof ApiError && requestError.status === 401
          ? 'Your session has expired. Please sign in again.'
          : requestError instanceof ApiError && requestError.status === 403
            ? 'You do not have permission to view these shipments.'
            : requestError instanceof Error ? requestError.message : 'Unable to load shipments.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadShipments();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user, page, search, status, serviceType, sortBy, sortOrder]);

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated || !user) return <PageContainer><UnauthorizedState title="Please sign in" message="You need to sign in to view your shipments." /></PageContainer>;

  function applyFilters(newPage = 1, searchOverride = search) {
    const params = new URLSearchParams();
    if (searchOverride) params.set('search', searchOverride);
    if (status) params.set('status', status);
    if (serviceType) params.set('serviceType', serviceType);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    params.set('page', String(newPage));
    router.push(`/shipments?${params.toString()}`);
  }

  return (
    <PageContainer className="shipment-list-page">
      <section className="shipment-list-head">
        <div>
          <span className="section-kicker">Customer Shipments</span>
          <h1>My Shipments</h1>
        </div>
        <div className="shipment-list-controls">
          <input className="form-input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { const nextSearch = event.currentTarget.value.trim(); setSearch(nextSearch); applyFilters(1, nextSearch); } }} placeholder="Search shipments..." aria-label="Search shipments" />
          <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="EXCEPTION">Exception</option>
          </select>
          <select className="form-input" value={serviceType} onChange={(event) => setServiceType(event.target.value)} aria-label="Filter by service">
            <option value="">All Services</option>
            <option value="STANDARD">Standard</option>
            <option value="EXPRESS">Express</option>
            <option value="OVERNIGHT">Overnight</option>
          </select>
          <select className="form-input" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort shipments">
            <option value="createdAt">Newest</option>
            <option value="updatedAt">Recently Updated</option>
            <option value="estimatedDelivery">Estimated Delivery</option>
            <option value="trackingNumber">Tracking Number</option>
            <option value="status">Status</option>
          </select>
          <select className="form-input" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort order">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <button className="form-button" type="button" onClick={() => { const nextSearch = searchInput.trim(); setSearch(nextSearch); applyFilters(1, nextSearch); }}>Apply</button>
          <button className="form-button muted-button" type="button" onClick={() => { setSearchInput(''); setSearch(''); applyFilters(1, ''); }}>Clear</button>
        </div>
      </section>

      {error ? <ErrorCard title="Unable to load your shipments" message={error} /> : null}

      {loading ? <PageLoading /> : (
        <section className="shipment-list-grid">
          {shipments.length === 0 ? (
            <section className="empty-state">
              <h3>No shipments found</h3>
              <p>No matching shipments were found for your search.</p>
            </section>
          ) : (
            <div className="shipment-list-table">
              {shipments.map((shipment) => (
                <article className="shipment-list-row" key={shipment.id}>
                  <button className="shipment-link" type="button" onClick={() => router.push(`/shipments/${shipment.id}`)}>
                    {shipment.trackingNumber}
                  </button>
                  <span><ShipmentStatusBadge status={shipment.status} /></span>
                  <span>{shipment.destination?.city ?? shipment.destination?.country ?? 'Destination unavailable'}</span>
                  <span><ServiceTypeBadge type={shipment.serviceType} /></span>
                  <span>{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                  <span>{shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : 'Not yet estimated'}</span>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="pagination">
        <button className="form-button muted-button" type="button" disabled={page <= 1 || loading} onClick={() => applyFilters(page - 1)}>Previous</button>
        <span className="page-number">Page {page} / {Math.max(pagination.totalPages, 1)}</span>
        <button className="form-button muted-button" type="button" disabled={page >= pagination.totalPages || loading} onClick={() => applyFilters(page + 1)}>Next</button>
      </section>
    </PageContainer>
  );
}
