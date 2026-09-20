'use client';

import { ShipmentStatusBadge } from '../ui/status-badge';
import { ServiceTypeBadge } from '../ui/service-type-badge';
import { TrackingNumber } from '../ui/tracking-number';
import type { PublicTrackingResult } from './tracking-types';

export function ShipmentStatusSummary({ shipment }: { shipment: PublicTrackingResult }) {
  const cleanLocation = typeof shipment.currentLocation === 'string'
    ? shipment.currentLocation.trim()
    : shipment.currentLocation
      ? [shipment.currentLocation.name, shipment.currentLocation.city, shipment.currentLocation.country]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(', ')
      : '';
  const origin = shipment.origin ? [shipment.origin.city, shipment.origin.state, shipment.origin.country].filter(Boolean).join(', ') : 'Unknown origin';
  const destination = shipment.destination ? [shipment.destination.city, shipment.destination.state, shipment.destination.country].filter(Boolean).join(', ') : 'Unknown destination';

  return (
    <section className="shipment-status-summary">
      <div className="shipment-summary-head">
        <div>
          <span className="section-kicker">Track Shipment</span>
          <h1>Tracking Number: <TrackingNumber value={shipment.trackingNumber} /></h1>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Current Status</span>
          <span className="summary-value">{shipment.status}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Service Type</span>
          <span className="summary-value"><ServiceTypeBadge type={shipment.serviceType} /></span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Estimated Delivery</span>
          <span className="summary-value">{shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not available'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Actual Delivery</span>
          <span className="summary-value">{shipment.actualDelivery ? new Date(shipment.actualDelivery).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Not delivered yet'}</span>
        </div>
        {cleanLocation ? (
          <div className="summary-card">
            <span className="summary-label">Current Location</span>
            <span className="summary-value">{cleanLocation}</span>
          </div>
        ) : null}
      </div>

      <div className="origin-destination-grid">
        <section className="address-card">
          <span className="summary-label">Origin</span>
          <span className="summary-value">{origin}</span>
        </section>
        <section className="address-card">
          <span className="summary-label">Destination</span>
          <span className="summary-value">{destination}</span>
        </section>
      </div>
    </section>
  );
}
