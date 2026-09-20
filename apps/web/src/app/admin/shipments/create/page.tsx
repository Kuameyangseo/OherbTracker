import { AdminAccess } from '../../../../components/admin/admin-access';
import { ShipmentForm } from '../../../../components/admin/shipment-form';
import { PageContainer } from '../../../../components/layout/page-container';

export default function CreateShipmentPage() {
  return <AdminAccess><PageContainer><ShipmentForm /></PageContainer></AdminAccess>;
}
