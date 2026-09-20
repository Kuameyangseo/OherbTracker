import type { Metadata } from 'next';
import { PageContainer } from '../../../components/layout/page-container';
import { ErrorCard, NotFoundState, ServerErrorState } from '../../../components/ui/errors';
import { TrackingSearchForm } from '../../../components/tracking/tracking-search-form';
import { ShipmentStatusSummary } from '../../../components/tracking/shipment-status-summary';
import { TrackingTimeline } from '../../../components/tracking/tracking-timeline';
import { getPublicTracking, isValidTrackingNumber, normalizeTrackingNumber } from '../../../lib/api-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ trackingNumber: string }> }): Promise<Metadata> {
  const { trackingNumber } = await params;
  const normalized = normalizeTrackingNumber(trackingNumber);
  return {
    title: normalized ? `Track Shipment ${normalized}` : 'Track Your Shipment',
  };
}

export default async function TrackingResultPage({ params }: { params: Promise<{ trackingNumber: string }> }) {
  const { trackingNumber } = await params;
  const normalized = normalizeTrackingNumber(trackingNumber);

  if (!isValidTrackingNumber(normalized)) {
    return <PageContainer><section className="tracking-page"><ErrorCard title="Invalid Tracking Number" message="Please enter a valid tracking number." /><TrackingSearchForm /></section></PageContainer>;
  }

  try {
    const shipment = await getPublicTracking(normalized);
    return (
      <PageContainer>
        <section className="track-result-page">
          <div className="track-page-layout">
            <ShipmentStatusSummary shipment={shipment} />
            <section className="tracking-panel">
              <TrackingTimeline events={shipment.events ?? []} />
            </section>
            <section className="search-again-panel">
              <TrackingSearchForm initialValue={shipment.trackingNumber} className="inline-track-form" />
            </section>
          </div>
        </section>
      </PageContainer>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'We could not retrieve the shipment information right now.';
    if (message.toLowerCase().includes('not found')) {
      return <PageContainer><NotFoundState title="Shipment not found" message="We couldn't find a shipment with that tracking number. Please check the number and try again." /><TrackingSearchForm initialValue={normalized} /></PageContainer>;
    }

    if (message.toLowerCase().includes('invalid')) {
      return <PageContainer><ErrorCard title="Invalid Tracking Number" message="Please enter a valid tracking number." /><TrackingSearchForm /></PageContainer>;
    }

    return <PageContainer><ServerErrorState title="We couldn't retrieve the shipment information right now." message="Please try again in a moment." /><TrackingSearchForm initialValue={normalized} /></PageContainer>;
  }
}
