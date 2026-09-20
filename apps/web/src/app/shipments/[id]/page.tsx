import type { Metadata } from 'next';
import { ShipmentDetailPageContent } from '../../../components/shipments/shipment-detail';

export const metadata: Metadata = {
  title: 'Shipment Details',
};

export default async function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShipmentDetailPageContent shipmentId={id} />;
}
