import type { PublicTrackingEvent } from './tracking-types';

export function TrackingTimeline({ events }: { events: PublicTrackingEvent[] }) {
  return (
    <section className="tracking-timeline">
      <div className="tracking-timeline-head">
        <h2>Shipment Journey</h2>
      </div>
      <div className="timeline-list">
        {(events ?? []).map((event, index) => (
          <article className="timeline-item" key={`${event.status}-${event.timestamp}-${index}`}>
            <span className="timeline-marker" aria-hidden="true">
              {index < (events ?? []).length - 1 ? '●' : '○'}
            </span>
            <div className="timeline-content">
              <div className="timeline-status-row">
                <span className="timeline-status">{String(event.status).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
                <span className="timeline-date">{new Date(event.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })}</span>
              </div>
              <p className="timeline-description">{event.description || event.status}</p>
              <span className="timeline-location">{[event.location, event.city, event.country].filter(Boolean).join(', ') || 'Location unavailable'}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
