import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { AdminAnalytics } from './admin-analytics';
import type { AnalyticsServiceMetric, AnalyticsStatusMetric } from '@oherb-tracker/shared-types';
import { AuthProvider } from '../auth/auth-context';
const mockedOverview = {
  range: { key: '7d' as const, from: '2026-09-07T00:00:00.000Z', to: '2026-09-14T00:00:00.000Z', days: 7 },
  overview: { totalShipments: 4, activeShipments: 2, deliveredShipments: 2, exceptionShipments: 0, deliveryRate: 50, onTimeDeliveryRate: 100 },
  statusBreakdown: [{ status: 'DELIVERED' as AnalyticsStatusMetric['status'], count: 2 }],
  serviceBreakdown: [{ serviceType: 'EXPRESS' as AnalyticsServiceMetric['serviceType'], count: 4 }],
  trends: [{ date: '2026-09-13', shipmentsCreated: 4, trackingEvents: 5, deliveries: 2 }],
  deliveryPerformance: { deliveredShipments: 2, onTimeDeliveries: 2, lateDeliveries: 0, pendingDeliveryEstimate: 2, avgDeliveryDays: 2, avgDelayDays: 0 },
};

describe('admin analytics', () => {
  it('loads accessible metrics and supports a retry-friendly refresh control', async () => {
    const fetchMock = jest.fn<(input: RequestInfo | URL) => Promise<Response>>();
    fetchMock.mockImplementation((input) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => String(input).includes('/api/auth/me')
        ? { success: true, data: { user: { id: 'staff-1', email: 'staff@example.com', role: 'STAFF' } } }
        : { success: true, data: mockedOverview },
    } as Response));
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: fetchMock });
    render(<AuthProvider><AdminAnalytics initialQuery={{ range: '7d' }} /></AuthProvider>);
    expect(screen.getByRole('status')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Total shipments')).toBeTruthy());
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
  });
});
