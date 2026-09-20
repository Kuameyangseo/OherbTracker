'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AdminAccess } from './admin-access';
import { ApiError, createTrackingEvent, deleteShipment, getShipmentById, getShipmentEvents, updateShipment, updateShipmentStatus, type Shipment, type ShipmentStatus, type TrackingEvent, type TrackingEventInput } from '../../lib/api-client';
import { PageContainer } from '../layout/page-container';
import { ErrorCard, NotFoundState } from '../ui/errors';
import { PageLoading } from '../ui/loading';
import { ShipmentStatusBadge } from '../ui/status-badge';
import { ServiceTypeBadge } from '../ui/service-type-badge';
import { Input, Select, Textarea } from '../ui/forms';
import { ShipmentForm } from './shipment-form';
import { useAuth } from '../auth/auth-context';
import { useShipmentRealtime } from '../../lib/socket/socket-client';
import dynamic from 'next/dynamic';
import type { MapLocation } from '../maps/shipment-map';

const ShipmentMap = dynamic(() => import('../maps/shipment-map').then((module) => module.ShipmentMap), {
  ssr: false,
  loading: () => <div className="map-fallback" role="status">Loading map...</div>,
});

function mapLocation(location: { latitude?: number; longitude?: number; name?: string; city?: string; country?: string } | null | undefined, label?: string): MapLocation | undefined {
  if (location?.latitude === undefined || location.longitude === undefined) return undefined;
  return { latitude: location.latitude, longitude: location.longitude, label, city: location.city, country: location.country };
}

const transitions: Record<string, ShipmentStatus[]> = {
  CREATED: ['LABEL_CREATED', 'CANCELLED'], LABEL_CREATED: ['PICKED_UP', 'CANCELLED'], PICKED_UP: ['IN_TRANSIT', 'EXCEPTION'],
  IN_TRANSIT: ['ARRIVED_AT_FACILITY', 'EXCEPTION', 'RETURNED'], ARRIVED_AT_FACILITY: ['DEPARTED_FACILITY', 'EXCEPTION'],
  DEPARTED_FACILITY: ['ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'EXCEPTION'], OUT_FOR_DELIVERY: ['DELIVERED', 'EXCEPTION', 'RETURNED'],
  EXCEPTION: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'RETURNED', 'CANCELLED'], DELIVERED: [], CANCELLED: [], RETURNED: [],
};
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function ActionForm({ shipment, onSuccess }: { shipment: Shipment; onSuccess: (message: string) => Promise<void> }) {
  const [mode, setMode] = useState<'status' | 'event'>('status');
  const [status, setStatus] = useState<ShipmentStatus>(transitions[shipment.status]?.[0] ?? shipment.status);
  const [form, setForm] = useState({ description: '', location: shipment.currentLocation?.name ?? '', city: shipment.currentLocation?.city ?? '', country: shipment.currentLocation?.country ?? '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const options = mode === 'status' ? transitions[shipment.status] ?? [] : Object.keys(transitions) as ShipmentStatus[];

  useEffect(() => {
    setStatus(transitions[shipment.status]?.[0] ?? shipment.status);
  }, [shipment.status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!status || form.description.trim().length < 2 || form.location.trim().length < 2 || form.city.trim().length < 2 || form.country.trim().length < 2) {
      setError('Status, description, location, city, and country are required.');
      return;
    }

    setSubmitting(true);
    const input: TrackingEventInput = { status, description: form.description.trim(), location: form.location.trim(), city: form.city.trim(), country: form.country.trim() };
    try {
      if (mode === 'status') await updateShipmentStatus(shipment.id, input);
      else await createTrackingEvent(shipment.id, input);
      setForm({ ...form, description: '' });
      await onSuccess(mode === 'status' ? 'Shipment status updated successfully.' : 'Tracking event added successfully.');
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && (requestError.status === 409 || requestError.code === 'INVALID_STATUS_TRANSITION')
          ? 'This shipment cannot be moved to that status.'
          : requestError instanceof ApiError && requestError.status === 403
            ? 'You do not have permission to perform this action.'
            : requestError instanceof ApiError && requestError.status === 401
              ? 'Your session has expired. Please sign in again.'
              : requestError instanceof ApiError && requestError.status === 422
                ? Object.values(requestError.details ?? {})[0] ?? 'Please check the form and try again.'
                : requestError instanceof Error
                  ? requestError.message
                  : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="admin-actions-panel">
    <div className="panel-title-row"><h2>Shipment Actions</h2><div className="action-tabs"><button className={mode === 'status' ? 'active' : ''} onClick={() => setMode('status')}>Update Status</button><button className={mode === 'event' ? 'active' : ''} onClick={() => setMode('event')}>Add Tracking Event</button></div></div>
    <form className="admin-action-form" onSubmit={submit}>
      <label className="form-label" htmlFor="admin-status">Status</label>
      <Select id="admin-status" value={status} onChange={(event) => setStatus(event.target.value as ShipmentStatus)} disabled={submitting}><option value="">Select status</option>{options.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select>
      <label className="form-label" htmlFor="admin-location">Location</label><Input id="admin-location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} disabled={submitting} />
      <label className="form-label" htmlFor="admin-city">City</label><Input id="admin-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} disabled={submitting} />
      <label className="form-label" htmlFor="admin-country">Country</label><Input id="admin-country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} disabled={submitting} />
      <label className="form-label" htmlFor="admin-description">Description</label><Textarea id="admin-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} disabled={submitting} maxLength={500} />
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="form-button" type="submit" disabled={submitting || options.length === 0}>{submitting ? 'Saving...' : mode === 'status' ? 'Update Status' : 'Add Event'}</button>
    </form>
  </section>;
}

function LocationForm({ shipment, onSuccess }: { shipment: Shipment; onSuccess: (message: string) => Promise<void> }) {
 const [form, setForm] = useState({
   name: shipment.currentLocation?.name ?? '',
   city: shipment.currentLocation?.city ?? '',
   country: shipment.currentLocation?.country ?? '',
   latitude: shipment.currentLocation?.latitude?.toString() ?? '',
   longitude: shipment.currentLocation?.longitude?.toString() ?? '',
 });
 const [error, setError] = useState('');
 const [saving, setSaving] = useState(false);

 async function submit(event: FormEvent) {
   event.preventDefault();
   setError('');
   const latitude = Number(form.latitude);
   const longitude = Number(form.longitude);
   if (!form.name.trim() || !form.city.trim() || !form.country.trim()) return setError('Location name, city, and country are required.');
   if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return setError('Latitude must be between -90 and 90.');
   if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return setError('Longitude must be between -180 and 180.');
   setSaving(true);
   try {
     await updateShipment(shipment.id, { currentLocation: { name: form.name.trim(), city: form.city.trim(), country: form.country.trim(), latitude, longitude } });
     await onSuccess('Shipment location updated successfully.');
   } catch (requestError) {
     setError(requestError instanceof ApiError ? requestError.message : 'We could not update the shipment location.');
   } finally {
     setSaving(false);
   }
 }

 return <section className="admin-actions-panel">
   <div className="panel-title-row"><h2>Update Location</h2><span className="form-help">Only staff and administrators can update shipment coordinates.</span></div>
   <form className="admin-action-form location-form" onSubmit={submit}>
     <Input aria-label="Location name" placeholder="Location label" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={saving} />
     <Input aria-label="City" placeholder="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} disabled={saving} />
     <Input aria-label="Country" placeholder="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} disabled={saving} />
     <Input aria-label="Latitude" type="number" min="-90" max="90" step="any" placeholder="Latitude" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} disabled={saving} />
     <Input aria-label="Longitude" type="number" min="-180" max="180" step="any" placeholder="Longitude" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} disabled={saving} />
     {error ? <p className="error-message" role="alert">{error}</p> : null}
     <button className="form-button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update Location'}</button>
   </form>
 </section>;
}

export function AdminShipmentDetail({ shipmentId }: { shipmentId: string }) {
  const { user } = useAuth();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const [detail, eventResponse] = await Promise.all([getShipmentById(shipmentId), getShipmentEvents(shipmentId)]);
      setShipment(detail.shipment); setEvents(eventResponse.events ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 404
          ? 'not-found'
          : requestError instanceof ApiError && requestError.status === 403
            ? 'You do not have permission to view this shipment.'
            : requestError instanceof ApiError && requestError.status === 401
              ? 'Your session has expired. Please sign in again.'
              : requestError instanceof Error
                ? requestError.message
                : 'Unable to load shipment.',
      );
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [shipmentId]);
  const latestEvent = useMemo(() => events.at(-1), [events]);
  const realtime = useShipmentRealtime(shipmentId, {
    enabled: Boolean(shipment),
    onShipmentChanged: (update) => setShipment((current) => current ? { ...current, ...update } : current),
    onTrackingEvent: (event) => setEvents((current) => {
      const identity = event.id ?? `${event.status}|${event.timestamp ?? ''}|${event.description ?? ''}|${event.location ?? ''}`;
      if (current.some((item) => (item.id ?? `${item.status}|${item.timestamp ?? ''}|${item.description ?? ''}|${item.location ?? ''}`) === identity)) return current;
      return [...current, event].sort((left, right) => new Date(left.timestamp ?? 0).getTime() - new Date(right.timestamp ?? 0).getTime());
    }),
    onReconnect: () => { void load(); },
  });
  async function removeShipment() {
    if (!shipment || !window.confirm('Delete this shipment? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteShipment(shipment.id);
      window.location.assign('/admin/shipments');
    } catch (requestError) {
      setMessage(
        requestError instanceof ApiError && requestError.status === 403
          ? 'Only administrators can delete shipments.'
          : requestError instanceof ApiError && requestError.status === 404
            ? 'This shipment no longer exists.'
            : requestError instanceof ApiError && requestError.status === 401
              ? 'Your session has expired. Please sign in again.'
              : 'We could not delete this shipment. Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return <AdminAccess><PageContainer className="admin-page">
    {loading ? <PageLoading /> : error === 'not-found' ? <><NotFoundState title="Shipment not found" message="The shipment may no longer exist or the link may be invalid." /><Link className="form-button" href="/admin/shipments">Back to Shipments</Link></> : error ? <ErrorCard title="Unable to load shipment" message={error} /> : shipment ? <>
      <Link className="back-link" href="/admin/shipments">← Back to Shipments</Link>
      <div className="admin-page-heading"><div><span className="section-kicker">Shipment Management</span><h1>{shipment.trackingNumber}</h1></div><div className="detail-actions"><ShipmentStatusBadge status={shipment.status} /><span className={`realtime-indicator ${realtime === 'connected' ? 'is-live' : ''}`} aria-live="polite">{realtime === 'connected' ? '● Live updates' : '○ Live updates unavailable'}</span><button className="form-button muted-button" type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel Edit' : 'Edit Shipment'}</button></div></div>
      {message ? <div className="alert alert-success" role="status">{message}</div> : null}
      {editing ? <ShipmentForm shipment={shipment} /> : null}
      <section className="detail-grid"><article className="detail-card"><span className="card-label">Customer</span><span className="card-value">{shipment.customer?.name ?? shipment.customer?.email ?? 'Unavailable'}</span></article><article className="detail-card"><span className="card-label">Service</span><span className="card-value"><ServiceTypeBadge type={shipment.serviceType} /></span></article><article className="detail-card"><span className="card-label">Origin</span><span className="card-value">{shipment.origin?.city ?? shipment.origin?.country ?? 'Unavailable'}</span></article><article className="detail-card"><span className="card-label">Destination</span><span className="card-value">{shipment.destination?.city ?? shipment.destination?.country ?? 'Unavailable'}</span></article></section>
      <section className="detail-timeline"><div className="panel-title-row"><h2>Shipment Map</h2><span className="form-help">Markers appear only when coordinates are available.</span></div><ShipmentMap origin={mapLocation(shipment.origin, shipment.origin?.city)} currentLocation={mapLocation(shipment.currentLocation, shipment.currentLocation?.name)} destination={mapLocation(shipment.destination, shipment.destination?.city)} /></section>
      <section className="detail-grid-two"><article className="detail-card"><h2>Shipment Information</h2><div className="detail-row"><span className="detail-label">Current Location</span><span>{shipment.currentLocation?.name ?? latestEvent?.location ?? 'Unavailable'}</span></div><div className="detail-row"><span className="detail-label">Created</span><span>{shipment.createdAt ? new Date(shipment.createdAt).toLocaleString() : 'Unknown'}</span></div><div className="detail-row"><span className="detail-label">Updated</span><span>{shipment.updatedAt ? new Date(shipment.updatedAt).toLocaleString() : 'Unknown'}</span></div></article><article className="detail-card"><h2>Tracking History</h2>{events.length === 0 ? <p>No tracking events are available.</p> : <ul className="timeline-list">{events.map((event, index) => <li className={`timeline-item ${index === events.length - 1 ? 'timeline-latest' : ''}`} key={`${event.timestamp}-${index}`}><span className="timeline-dot" /><div><strong><ShipmentStatusBadge status={event.status} /></strong><p>{event.description}</p><div className="timeline-meta">{[event.location, event.city, event.country].filter(Boolean).join(', ')}</div><div className="timeline-meta">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Timestamp unavailable'}</div></div></li>)}</ul>}</article></section>
      <ActionForm shipment={shipment} onSuccess={async (successMessage) => { setMessage(successMessage); await load(); }} />
      <LocationForm shipment={shipment} onSuccess={async (successMessage) => { setMessage(successMessage); await load(); }} />
      {user?.role === 'ADMIN' && <button className="danger-button" type="button" disabled={deleting} onClick={() => void removeShipment()}>{deleting ? 'Deleting...' : 'Delete Shipment'}</button>}
    </> : null}
  </PageContainer></AdminAccess>;
}
