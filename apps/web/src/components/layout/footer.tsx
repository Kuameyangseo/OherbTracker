import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <section className="footer-brand">
          <Link className="brand" href="/">
            <span className="brand-mark">OT</span>
            <span className="brand-copy">
              <span className="brand-name">Oherbtracker</span>
              <span className="brand-tag">Logistics</span>
            </span>
          </Link>
          <p className="footer-summary">Reliable shipment visibility for every mile.</p>
        </section>
        <section className="footer-links">
          <div>
            <span className="footer-label">Company</span>
            <Link href="#">About</Link>
            <Link href="#">Operations</Link>
            <Link href="#">Careers</Link>
          </div>
          <div>
            <span className="footer-label">Tracking</span>
            <Link href="/track">Track Shipment</Link>
            <Link href="/shipments">Shipments</Link>
            <Link href="#">Service Options</Link>
          </div>
          <div>
            <span className="footer-label">Support</span>
            <Link href="#">Help Center</Link>
            <Link href="#">Claims</Link>
            <Link href="#">Contact</Link>
          </div>
          <div>
            <span className="footer-label">Legal</span>
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Security</Link>
          </div>
        </section>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Oherbtracker Logistics</span>
        <span>Shipment visibility platform</span>
      </div>
    </footer>
  );
}
