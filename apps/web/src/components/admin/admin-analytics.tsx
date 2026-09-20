'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminAccess } from './admin-access';
import { getAnalyticsOverview, type AnalyticsQuery } from '../../lib/api-client';
import type { AnalyticsOverview } from '@oherb-tracker/shared-types';
import { PageContainer } from '../layout/page-container';
import { EmptyState } from '../ui/empty-state';
import { ErrorCard } from '../ui/errors';
import { PageLoading } from '../ui/loading';

const rangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
] as const;

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function shortDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function BarList({ items, label }: { items: Array<{ label: string; value: number }>; label: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="analytics-bars" aria-label={label}>
      {items.map((item) => (
        <div className="analytics-bar-row" key={item.label}>
          <span className="analytics-bar-label">{item.label}</span>
          <span className="analytics-bar-track" aria-hidden="true"><span style={{ width: `${(item.value / max) * 100}%` }} /></span>
          <strong>{number(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalytics({ initialQuery }: { initialQuery: AnalyticsQuery }) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<AnalyticsOverview>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const queryKey = useMemo(() => JSON.stringify(query), [query]);
  const customRangeIncomplete = query.range === 'custom' && (!query.from || !query.to);

  useEffect(() => {
    if (customRangeIncomplete) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    void getAnalyticsOverview(query)
      .then((response) => { if (active) setData(response); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load analytics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [queryKey, refreshToken, customRangeIncomplete, query]);

  function updateQuery(next: Partial<AnalyticsQuery>) {
    const nextQuery = { ...query, ...next };
    if (next.range && next.range !== 'custom') {
      delete nextQuery.from;
      delete nextQuery.to;
    }
    setQuery(nextQuery);
    const params = new URLSearchParams({ range: nextQuery.range });
    if (nextQuery.range === 'custom' && nextQuery.from) params.set('from', nextQuery.from);
    if (nextQuery.range === 'custom' && nextQuery.to) params.set('to', nextQuery.to);
    window.history.replaceState(null, '', `/admin/analytics?${params.toString()}`);
  }

  return (
    <AdminAccess>
      <PageContainer className="admin-page analytics-page">
        <div className="admin-page-heading">
          <div>
            <span className="section-kicker">Internal Operations</span>
            <h1>Analytics &amp; reporting</h1>
            <p className="muted-copy">Monitor shipment volume, delivery health, and operational activity.</p>
          </div>
          <div className="analytics-heading-actions">
            <button className="form-button" type="button" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>Refresh</button>
            <Link className="form-button" href="/admin/reports">Generate Report</Link>
            <Link className="back-link" href="/admin">Operations Dashboard</Link>
          </div>
        </div>

        <section className="analytics-filter-panel" aria-label="Analytics date range">
          <label className="form-label" htmlFor="analytics-range">Date range</label>
          <select id="analytics-range" value={query.range} onChange={(event) => updateQuery({ range: event.target.value as AnalyticsQuery['range'] })}>
            {rangeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
          {query.range === 'custom' ? (
            <>
              <label className="form-label" htmlFor="analytics-from">From</label>
              <input id="analytics-from" type="date" value={query.from ?? ''} onChange={(event) => updateQuery({ from: event.target.value })} />
              <label className="form-label" htmlFor="analytics-to">To</label>
              <input id="analytics-to" type="date" value={query.to ?? ''} onChange={(event) => updateQuery({ to: event.target.value })} />
            </>
          ) : null}
        </section>

        {loading ? <PageLoading /> : error ? (
          <section>
            <ErrorCard title="Unable to load analytics" message={error} />
            <button className="form-button" type="button" onClick={() => setRefreshToken((value) => value + 1)}>Try again</button>
          </section>
        ) : customRangeIncomplete ? (
          <EmptyState title="Choose a custom date range" description="Select both a start and end date to view analytics." />
        ) : !data || data.overview.totalShipments === 0 ? (
          <EmptyState title="No analytics for this range" description="There are no shipments in the selected period. Try a wider date range." />
        ) : (
          <>
            <p className="analytics-range-summary" aria-live="polite">Showing {shortDate(data.range.from.slice(0, 10))} – {shortDate(new Date(new Date(data.range.to).getTime() - 1).toISOString().slice(0, 10))}</p>
            <section className="analytics-kpi-grid" aria-label="Overview metrics">
              <article className="analytics-kpi"><span>Total shipments</span><strong>{number(data.overview.totalShipments)}</strong></article>
              <article className="analytics-kpi"><span>In transit</span><strong>{number(data.overview.inTransitShipments)}</strong></article>
              <article className="analytics-kpi"><span>Out for delivery</span><strong>{number(data.overview.outForDeliveryShipments)}</strong></article>
              <article className="analytics-kpi"><span>Delivery rate</span><strong>{percent(data.overview.deliveryRate)}</strong><small>Delivered / completed shipments</small></article>
              <article className="analytics-kpi"><span>On-time delivery</span><strong>{percent(data.overview.onTimeDeliveryRate)}</strong><small>Among delivered shipments with an estimate</small></article>
            </section>

            <section className="analytics-grid">
              <article className="analytics-card"><h2>Status mix</h2><BarList label="Shipments by status" items={data.statusBreakdown.map((item) => ({ label: item.status.replaceAll('_', ' '), value: item.count }))} /></article>
              <article className="analytics-card"><h2>Service mix</h2><BarList label="Shipments by service" items={data.serviceBreakdown.map((item) => ({ label: item.serviceType, value: item.count }))} /></article>
              <article className="analytics-card analytics-card-wide"><h2>Operational trend</h2>
                <div className="analytics-trend" role="img" aria-label="Daily shipments created, tracking events, and deliveries">
                  {data.trends.map((trend) => <div className="analytics-trend-column" key={trend.date}><span className="analytics-trend-bars"><i style={{ height: `${Math.max((trend.shipmentsCreated / Math.max(...data.trends.map((item) => item.shipmentsCreated), 1)) * 100, 3)}%` }} /><i className="event" style={{ height: `${Math.max((trend.trackingEvents / Math.max(...data.trends.map((item) => item.trackingEvents), 1)) * 100, 3)}%` }} /></span><small>{shortDate(trend.date)}</small></div>)}
                </div>
                <p className="analytics-legend"><span><i /> Shipments created</span><span><i className="event" /> Tracking events</span></p>
              </article>
            </section>

            <section className="analytics-card">
              <h2>Delivery performance</h2>
              <div className="analytics-performance-grid">
                <div><span>Delivered</span><strong>{number(data.deliveryPerformance.deliveredShipments)}</strong></div>
                <div><span>On time</span><strong>{number(data.deliveryPerformance.onTimeDeliveries)}</strong></div>
                <div><span>Late</span><strong>{number(data.deliveryPerformance.lateDeliveries)}</strong></div>
                <div><span>Awaiting delivery</span><strong>{number(data.deliveryPerformance.pendingDeliveryEstimate)}</strong></div>
                <div><span>Average delivery time</span><strong>{data.deliveryPerformance.avgDeliveryDays === null ? '—' : `${data.deliveryPerformance.avgDeliveryDays.toFixed(1)} days`}</strong></div>
                <div><span>Average delay</span><strong>{data.deliveryPerformance.avgDelayDays === null ? '—' : `${data.deliveryPerformance.avgDelayDays.toFixed(1)} days`}</strong></div>
              </div>
            </section>

            <section className="analytics-card analytics-table-wrap">
              <h2>Daily detail</h2>
              <table><caption className="sr-only">Daily shipment and tracking activity</caption><thead><tr><th scope="col">Date</th><th scope="col">Created</th><th scope="col">Tracking events</th><th scope="col">Deliveries</th></tr></thead><tbody>{data.trends.map((trend) => <tr key={trend.date}><th scope="row">{shortDate(trend.date)}</th><td>{number(trend.shipmentsCreated)}</td><td>{number(trend.trackingEvents)}</td><td>{number(trend.deliveries)}</td></tr>)}</tbody></table>
            </section>
          </>
        )}
      </PageContainer>
    </AdminAccess>
  );
}
