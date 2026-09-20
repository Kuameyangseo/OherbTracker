import { AdminShipmentList } from '../../../components/admin/admin-shipment-list';
import type { ShipmentListQuery } from '../../../lib/api-client';

export default async function AdminShipmentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(first(params?.page) ?? '1', 10);
  const query: ShipmentListQuery = {
    search: first(params?.search) ?? '',
    status: first(params?.status) ?? '',
    serviceType: first(params?.serviceType) ?? '',
    sortBy: first(params?.sortBy) ?? 'createdAt',
    sortOrder: first(params?.sortOrder) ?? 'desc',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
  return <AdminShipmentList initialQuery={query} />;
}
