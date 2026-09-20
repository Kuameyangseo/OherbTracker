import Link from 'next/link';
import { AdminAccess } from '../../components/admin/admin-access';
import { PageContainer } from '../../components/layout/page-container';

export default function AdminPage() {
  return (
    <AdminAccess>
      <PageContainer>
        <section className="admin-hero">
          <span className="section-kicker">Internal Operations</span>
          <h1>Operations Dashboard</h1>
          <p className="muted-copy">Manage shipments and monitor shipment activity.</p>
        </section>
        <section className="admin-action-grid">
          <Link className="admin-action-card" href="/admin/shipments">
            <span className="card-label">Shipment Management</span>
            <strong>Manage Shipments</strong>
            <span>View, search, and update shipments.</span>
          </Link>
          <Link className="admin-action-card" href="/admin/shipments/create">
            <span className="card-label">Quick Action</span>
            <strong>Create Shipment</strong>
            <span>Register a new shipment for an existing customer.</span>
          </Link>
          <Link className="admin-action-card" href="/admin/shipments">
            <span className="card-label">Quick Action</span>
            <strong>View Shipments</strong>
            <span>Open the operations shipment queue.</span>
          </Link>
          <Link className="admin-action-card" href="/admin/analytics">
            <span className="card-label">Operational Insights</span>
            <strong>View Analytics</strong>
            <span>Review volume, status, trends, and delivery performance.</span>
          </Link>
          <Link className="admin-action-card" href="/admin/reports">
            <span className="card-label">Operational Exports</span>
            <strong>View Reports</strong>
            <span>Preview filtered data and export staff reports as CSV.</span>
          </Link>
        </section>
      </PageContainer>
    </AdminAccess>
  );
}
