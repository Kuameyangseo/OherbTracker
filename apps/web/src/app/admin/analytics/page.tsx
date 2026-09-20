import { AdminAnalytics } from '../../../components/admin/admin-analytics';
import type { AnalyticsQuery } from '../../../lib/api-client';

const ranges = new Set<AnalyticsQuery['range']>(['7d', '30d', '90d', 'custom']);

export default async function AdminAnalyticsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const requestedRange = first(params?.range);
  const range = ranges.has(requestedRange as AnalyticsQuery['range']) ? requestedRange as AnalyticsQuery['range'] : '30d';
  return <AdminAnalytics initialQuery={{ range, from: range === 'custom' ? first(params?.from) : undefined, to: range === 'custom' ? first(params?.to) : undefined }} />;
}
