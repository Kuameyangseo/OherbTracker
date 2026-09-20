import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../auth/auth-context';
import type { OperationalReportType } from '@oherb-tracker/shared-types';
import { AdminReports } from './admin-reports';

const preview = {
  reportType: 'shipment' as OperationalReportType,
  filters: { reportType: 'shipment' as OperationalReportType, page: 1, limit: 20 },
  rows: [{
    trackingNumber: 'ST1234GH',
    status: 'IN_TRANSIT',
    serviceType: 'EXPRESS',
    createdAt: '2026-09-14T00:00:00.000Z',
    estimatedDelivery: null,
    actualDelivery: null,
  }],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

function renderReports() {
  return render(
    <AuthProvider>
      <AdminReports initialQuery={{ reportType: 'shipment' as OperationalReportType }} />
    </AuthProvider>,
  );
}

describe('admin reports', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn<(input: RequestInfo | URL) => Promise<Response>>((input) => Promise.resolve({
        ok: true,
        status: 200,
        json: async () => String(input).includes('/api/auth/me') ? { success: true, data: { user: { id: 'staff-1', email: 'staff@example.com', role: 'STAFF' } } } : { success: true, data: preview },
        blob: async () => new Blob(['trackingNumber']),
      } as Response)),
    });
  });

  it('loads a staff preview and exposes report navigation', async () => {
    renderReports();
    expect(screen.getByRole('status')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('ST1234GH')).toBeTruthy());
    expect(screen.getByRole('link', { name: 'Operations Dashboard' }).getAttribute('href')).toBe('/admin');
  });

  it('shows empty and error states', async () => {
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockImplementation((input: unknown) => Promise.resolve({
      ok: !String(input).includes('/api/admin/reports/preview'),
      status: 500,
      json: async () => String(input).includes('/api/auth/me') ? { success: true, data: { user: { id: 'staff-1', email: 'staff@example.com', role: 'STAFF' } } } : { success: false, error: { message: 'Report unavailable' } },
    } as Response));
    renderReports();
    await waitFor(() => expect(screen.getByText('Report unavailable')).toBeTruthy());
  });

  it('shows an empty result state', async () => {
    const fetchMock = globalThis.fetch as unknown as jest.Mock;
    fetchMock.mockImplementation((input: unknown) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => String(input).includes('/api/auth/me')
        ? { success: true, data: { user: { id: 'staff-1', email: 'staff@example.com', role: 'STAFF' } } }
        : { success: true, data: { ...preview, rows: [], pagination: { ...preview.pagination, total: 0, totalPages: 0 } } },
    } as Response));
    renderReports();
    await waitFor(() => expect(screen.getByText('No report results')).toBeTruthy());
  });

  it('prevents duplicate exports while the download is pending', async () => {
    const fetchMock = globalThis.fetch as jest.Mock;
    let resolveExport: ((value: Response) => void) | undefined;
    fetchMock.mockImplementation((input: unknown) => {
      if (String(input).includes('/api/admin/reports/export')) return new Promise<Response>((resolve) => { resolveExport = resolve; });
      return Promise.resolve({ ok: true, status: 200, json: async () => String(input).includes('/api/auth/me') ? { success: true, data: { user: { id: 'staff-1', email: 'staff@example.com', role: 'STAFF' } } } : { success: true, data: preview } } as Response);
    });
    renderReports();
    await waitFor(() => expect(screen.getByText('ST1234GH')).toBeTruthy());
    const button = screen.getByRole('button', { name: 'Export CSV' });
    button.click();
    button.click();
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/admin/reports/export'))).toHaveLength(1);
    resolveExport?.({ ok: true, status: 200, blob: async () => new Blob(['csv']) } as Response);
  });
});
