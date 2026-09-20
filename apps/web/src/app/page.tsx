import Link from 'next/link';
import { PageContainer } from '../components/layout/page-container';

export default function HomePage() {
  return (
    <PageContainer>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="section-kicker">Oherbtracker Logistics</span>
          <h1>Track Your Shipment<br />Every Step of the Way</h1>
          <p className="hero-lede">Reliable visibility from pickup to final delivery.</p>

          <div className="hero-search">
            <label className="sr-only" htmlFor="tracking-number-home">
              Tracking number
            </label>
            <input id="tracking-number-home" className="hero-input" type="text" placeholder="Enter tracking number" />
            <Link className="hero-button" href="/track">
              Track Shipment
            </Link>
          </div>

          <div className="hero-proof">
            <span>Same-day dispatch visibility</span>
            <span>Multi-region support</span>
            <span>Delivery milestones</span>
          </div>
        </div>

        <aside className="hero-card">
          <div className="hero-card-top">
            <span className="mini-label">Network Status</span>
            <span className="online-dot" />
          </div>
          <div className="hero-card-body">
            <div>
              <span className="hero-card-label">Today’s Operations</span>
              <span className="hero-card-number">126</span>
              <span className="hero-card-label-sub">Active shipments</span>
            </div>
            <div className="hero-card-grid">
              <span>
                <strong>42</strong>
                <small>In transit</small>
              </span>
              <span>
                <strong>18</strong>
                <small>Out for delivery</small>
              </span>
            </div>
          </div>
        </aside>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <span className="feature-icon">01</span>
          <h3>Reliable Delivery</h3>
          <p>Clear handoffs and consistent milestone visibility across every shipment.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">02</span>
          <h3>Shipment Visibility</h3>
          <p>Track movement across facilities, destination updates, and delivery events.</p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">03</span>
          <h3>Multiple Service Options</h3>
          <p>Coordinate delivery speed with service types suited to your timeline.</p>
        </article>
      </section>
    </PageContainer>
  );
}
