import type { Metadata } from 'next';
import { AdminShipmentDetail } from '../../../../components/admin/admin-shipment-detail';

export const metadata: Metadata = { title: 'Manage Shipment' };

export default async function AdminShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminShipmentDetail shipmentId={id} />;
}
