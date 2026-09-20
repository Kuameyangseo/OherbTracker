'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, getShipmentById, getShipmentEvents, type Shipment, type TrackingEvent } from '../../lib/api-client';
import { PageContainer } from '../layout/page-container';
import { ErrorCard, NotFoundState, ServerErrorState, UnauthorizedState } from '../ui/errors';
import { PageLoading } from '../ui/loading';
import { ShipmentStatusBadge } from '../ui/status-badge';
import { ServiceTypeBadge } from '../ui/service-type-badge';
import { TrackingNumber } from '../ui/tracking-number';
import { useAuth } from '../auth/auth-context';
import { useShipmentRealtime } from '../../lib/socket/socket-client';
import type { MapLocation } from '../maps/shipment-map';
import dynamic from 'next/dynamic';

const ShipmentMap = dynamic(() => import('../maps/shipment-map').then((module) => module.ShipmentMap), {
  ssr: false,
  loading: () => <div className="map-fallback" role="status">Loading map...</div>,
});

function mapLocation(location: { latitude?: number; longitude?: number; name?: string; city?: string; country?: string } | null | undefined, label?: string): MapLocation | undefined {
  if (location?.latitude === undefined || location.longitude === undefined) return undefined;
  return { latitude: location.latitude, longitude: location.longitude, label, city: location.city, country: location.country };
}

export function ShipmentDetailPageContent({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadDetail() {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    setError('');
    try {
      const detail = await getShipmentById(shipmentId);
      const eventsResponse = await getShipmentEvents(shipmentId);
      setShipment(detail.shipment ?? null);
      setEvents(eventsResponse.events ?? []);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load shipment.';
      if (requestError instanceof ApiError && requestError.status === 404) setError('not-found');
      else if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 403)) setError('unauthorized');
      else setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [isAuthenticated, user, shipmentId]);

  const handleRealtimeShipment = useCallback((update: Pick<Shipment, 'status' | 'currentLocation' | 'estimatedDelivery' | 'actualDelivery' | 'updatedAt'>) => {
    setShipment((current) => current ? { ...current, ...update } : current);
  }, []);
  const handleRealtimeEvent = useCallback((event: TrackingEvent) => {
    setEvents((current) => {
      const identity = event.id ?? `${event.status}|${event.timestamp ?? ''}|${event.description ?? ''}|${event.location ?? ''}`;
      if (current.some((item) => (item.id ?? `${item.status}|${item.timestamp ?? ''}|${item.description ?? ''}|${item.location ?? ''}`) === identity)) return current;
      return [...current, event].sort((left, right) => new Date(left.timestamp ?? 0).getTime() - new Date(right.timestamp ?? 0).getTime());
    });
  }, []);
  const handleReconnect = useCallback(() => { void loadDetail(); }, [isAuthenticated, user, shipmentId]);
  const realtime = useShipmentRealtime(shipmentId, {
    enabled: isAuthenticated && Boolean(shipment),
    onShipmentChanged: handleRealtimeShipment,
    onTrackingEvent: handleRealtimeEvent,
    onReconnect: handleReconnect,
  });

  if (isLoading) return <PageLoading />;
  if (!isAuthenticated || !user) return <PageContainer><UnauthorizedState title="Please sign in" message="You need to sign in to view this shipment." /></PageContainer>;

  if (loading) return <PageLoading />;
  if (error === 'not-found') return <PageContainer><NotFoundState title="Shipment not found" message="The shipment may no longer exist or the link may be invalid." /></PageContainer>;
  if (error === 'unauthorized') return <PageContainer><ErrorCard title="You do not have permission to view this shipment." message="Please sign in with the correct account or try again." /></PageContainer>;
  if (error) return <PageContainer><ServerErrorState title="We couldn't load this shipment right now." message="Please try again." /><button className="form-button" type="button" onClick={() => void loadDetail()}>Try Again</button></PageContainer>;

  if (!shipment) return <PageLoading />;

  return (
    <PageContainer className="shipment-detail-page">
      <section className="shipment-detail-top">
        <button className="back-link" type="button" onClick={() => router.push('/shipments')}>← Back to Shipments</button>
        <div className="detail-heading-row">
          <div>
            <span className="section-kicker">Shipment Details</span>
            <h1>{shipment.trackingNumber}</h1>
          </div>
          <div className="detail-status-wrap">
            <ShipmentStatusBadge status={shipment.status} />
            <span className={`realtime-indicator ${realtime === 'connected' ? 'is-live' : ''}`} aria-live="polite">
              {realtime === 'connected' ? '● Live updates' : '○ Live updates unavailable'}
            </span>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-card">
          <span className="card-label">Tracking Number</span>
          <span className="card-value"><TrackingNumber value={shipment.trackingNumber} /></span>
        </article>
        <article className="detail-card">
          <span className="card-label">Service</span>
          <span className="card-value"><ServiceTypeBadge type={shipment.serviceType} /></span>
        </article>
        <article className="detail-card">
          <span className="card-label">Origin</span>
          <span className="card-value">{shipment.origin?.city ?? shipment.origin?.country ?? 'Origin unavailable'}</span>
        </article>
        <article className="detail-card">
          <span className="card-label">Destination</span>
          <span className="card-value">{shipment.destination?.city ?? shipment.destination?.country ?? 'Destination unavailable'}</span>
        </article>
      </section>

      <section className="detail-grid-two">
        <article className="detail-card">
          <div className="detail-card-title">Delivery Overview</div>
          <div className="detail-row"><span className="detail-label">Origin</span><span>{shipment.origin?.city ?? shipment.origin?.country ?? 'Origin unavailable'}</span></div>
          <div className="detail-row"><span className="detail-label">Destination</span><span>{shipment.destination?.city ?? shipment.destination?.country ?? 'Destination unavailable'}</span></div>
          <div className="detail-row"><span className="detail-label">Current Location</span><span>{shipment.currentLocation?.name ?? shipment.currentLocation?.city ?? 'Current location unavailable'}</span></div>
          <div className="detail-row"><span className="detail-label">Estimated Delivery</span><span>{shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : 'Not delivered'}</span></div>
          <div className="detail-row"><span className="detail-label">Actual Delivery</span><span>{shipment.actualDelivery ? new Date(shipment.actualDelivery).toLocaleDateString() : 'Not delivered'}</span></div>
        </article>

        <article className="detail-card">
          <div className="detail-card-title">Shipment Information</div>
          <div className="detail-row"><span className="detail-label">Service</span><span><ServiceTypeBadge type={shipment.serviceType} /></span></div>
          <div className="detail-row"><span className="detail-label">Created</span><span>{shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : 'Unknown'}</span></div>
          <div className="detail-row"><span className="detail-label">Updated</span><span>{shipment.updatedAt ? new Date(shipment.updatedAt).toLocaleDateString() : 'Unknown'}</span></div>
          <div className="detail-row"><span className="detail-label">Weight</span><span>{shipment.weight ?? 'Not provided'}</span></div>
        </article>
      </section>

      <section className="detail-timeline">
        <div className="panel-title-row"><h2>Shipment Map</h2><span className="form-help">Map markers are shown only when trusted coordinates are available.</span></div>
        <ShipmentMap
          origin={mapLocation(shipment.origin, shipment.origin?.city)}
          currentLocation={mapLocation(shipment.currentLocation, shipment.currentLocation?.name)}
          destination={mapLocation(shipment.destination, shipment.destination?.city)}
        />
      </section>

      <section className="detail-timeline">
        <div className="panel-title-row">
          <h2>Tracking History</h2>
          <button className="form-button muted-button" type="button" onClick={() => router.push(`/track/${shipment.trackingNumber}`)}>View Public Tracking</button>
        </div>
        {events.length === 0 ? (
          <section className="empty-state"><h3>No tracking events</h3><p>No events are available for this shipment yet.</p></section>
        ) : (
          <ul className="timeline-list">
            {events.map((event, index) => (
              <li className="timeline-item" key={`${event.timestamp ?? index}-${event.location ?? index}-${event.description ?? 'event'}`}>
                <span className="timeline-dot" />
                <div>
                  <strong>{event.description ?? event.status}</strong>
                  <div className="timeline-meta">{event.location ?? event.city ?? 'Location unavailable'}{event.city ? ` • ${event.city}` : ''}{event.country ? `, ${event.country}` : ''}</div>
                  <div className="timeline-meta">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Timestamp unavailable'}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
