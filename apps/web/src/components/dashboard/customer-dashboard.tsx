'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { TrackingSearchForm } from '../tracking/tracking-search-form';
import { PageContainer } from '../layout/page-container';
import { ErrorCard, NotFoundState, ServerErrorState, UnauthorizedState } from '../ui/errors';
import { PageLoading } from '../ui/loading';
import { ShipmentStatusBadge } from '../ui/status-badge';
import { ServiceTypeBadge } from '../ui/service-type-badge';
import { listShipments, type Shipment, type ShipmentListResponse } from '../../lib/api-client';

const PAGE_LIMIT = 5;

export function CustomerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await listShipments({ page: 1, limit: PAGE_LIMIT, sortBy: 'createdAt', sortOrder: 'desc' });
        if (!active) return;
        setShipments(response.shipments ?? []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load shipments.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated || !user) {
    return <PageContainer><UnauthorizedState title="Please sign in" message="You need to sign in to view your dashboard." /></PageContainer>;
  }

  const total = shipments.length;
  const inTransit = shipments.filter((shipment) => shipment.status === 'IN_TRANSIT' || shipment.status === 'ARRIVED_AT_FACILITY' || shipment.status === 'DEPARTED_FACILITY' || shipment.status === 'OUT_FOR_DELIVERY').length;
  const delivered = shipments.filter((shipment) => shipment.status === 'DELIVERED').length;
  const exceptions = shipments.filter((shipment) => shipment.status === 'EXCEPTION').length;

  return (
    <PageContainer className="customer-dashboard">
      <section className="dashboard-top">
        <div>
          <span className="section-kicker">Customer Dashboard</span>
          <h1>Welcome back</h1>
          <p className="muted-copy">Manage your shipments, track deliveries, and view your shipment history.</p>
        </div>
        <div className="dashboard-track-panel">
          <TrackingSearchForm />
        </div>
      </section>

      {error ? <ErrorCard title="We couldn't load your dashboard" message={error} /> : null}

      {loading ? <PageLoading /> : (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <span className="summary-label">Total Shipments</span>
              <span className="summary-value">{total}</span>
            </article>
            <article className="summary-card">
              <span className="summary-label">In Transit</span>
              <span className="summary-value">{inTransit}</span>
            </article>
            <article className="summary-card">
              <span className="summary-label">Delivered</span>
              <span className="summary-value">{delivered}</span>
            </article>
            <article className="summary-card">
              <span className="summary-label">Exceptions</span>
              <span className="summary-value">{exceptions}</span>
            </article>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-panel">
              <div className="panel-title-row">
                <h2>Recent Shipments</h2>
                <button className="form-button muted-button" type="button" onClick={() => router.push('/shipments')}>View All Shipments</button>
              </div>

              {shipments.length === 0 ? (
                <section className="empty-state">
                  <h3>No shipments yet</h3>
                  <p>Your shipments will appear here once you create or receive one.</p>
                  <button className="form-button" type="button" onClick={() => router.push('/track')}>Track a Shipment</button>
                </section>
              ) : (
                <div className="shipment-table">
                  {shipments.map((shipment) => (
                    <div className="shipment-row" key={shipment.id}>
                      <div className="shipment-main">
                        <button className="shipment-link" type="button" onClick={() => router.push(`/shipments/${shipment.id}`)}>
                          {shipment.trackingNumber}
                        </button>
                        <span className="shipment-detail-label"><ShipmentStatusBadge status={shipment.status} /></span>
                        <span className="shipment-detail-label"><ServiceTypeBadge type={shipment.serviceType} /></span>
                      </div>
                      <div className="shipment-meta">
                        <span>{shipment.destination?.city ?? shipment.destination?.country ?? 'Destination'}</span>
                        <span>{shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : 'Estimated date unavailable'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="dashboard-panel quick-panel">
              <div className="panel-title-row">
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-actions">
                <button className="quick-action" type="button" onClick={() => router.push('/track')}>Track Shipment</button>
                <button className="quick-action" type="button" onClick={() => router.push('/shipments')}>View Shipments</button>
                <button className="quick-action" type="button" onClick={() => router.push('/profile')}>Profile</button>
              </div>
            </aside>
          </section>
        </>
      )}
    </PageContainer>
  );
}
