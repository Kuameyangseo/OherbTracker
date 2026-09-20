import { PageContainer } from '../../components/layout/page-container';
import { TrackingSearchForm } from '../../components/tracking/tracking-search-form';

export default function TrackPage() {
  return (
    <PageContainer>
      <section className="track-page">
        <div className="track-card">
          <span className="section-kicker">Shipment Tracking</span>
          <h1>Track Your Shipment</h1>
          <p className="muted-copy">Enter your tracking number to see the latest shipment status and delivery progress.</p>
          <TrackingSearchForm />
        </div>
      </section>
    </PageContainer>
  );
}
