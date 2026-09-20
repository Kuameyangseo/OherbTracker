import { ShipmentListPageContent, type ShipmentListQuery } from '../../components/shipments/shipment-list';

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = normalizeSearchParams(params ?? {});
  return <ShipmentListPageContent initialQuery={query} />;
}

function normalizeSearchParams(params: Record<string, string | string[] | undefined>): ShipmentListQuery {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const pageValue = Number.parseInt(first(params.page) ?? '1', 10);

  return {
    search: first(params.search) ?? '',
    status: first(params.status) ?? '',
    serviceType: first(params.serviceType) ?? first(params.service) ?? '',
    sortBy: first(params.sortBy) ?? first(params.sort) ?? 'createdAt',
    sortOrder: first(params.sortOrder) ?? first(params.order) ?? 'desc',
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}
