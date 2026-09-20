import React from 'react';
import { render, screen } from '@testing-library/react';
import { TrackingSearchForm } from './tracking-search-form';
import { getPublicTracking, normalizeTrackingNumber, isValidTrackingNumber } from '../../lib/api-client';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('tracking search form', () => {
  it('renders correctly', () => {
    render(<TrackingSearchForm />);
    expect(screen.getByLabelText('Tracking Number')).toBeTruthy();
    expect(screen.getByText('Track Shipment')).toBeTruthy();
  });

  it('accepts tracking number and normalizes uppercase', () => {
    const value = ' st123456789gh ';
    expect(normalizeTrackingNumber(value)).toBe('ST123456789GH');
    expect(isValidTrackingNumber('ST123456789GH')).toBe(true);
  });

  it('rejects empty input and invalid values', () => {
    expect(isValidTrackingNumber('')).toBe(false);
    expect(isValidTrackingNumber('   ')).toBe(false);
    expect(isValidTrackingNumber('!!!')).toBe(false);
  });

  it('uses the versioned public tracking endpoint', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          trackingNumber: 'ST123456789GH',
          status: 'IN_TRANSIT',
          events: [],
        },
      }),
    });

    global.fetch = fetchMock as typeof fetch;

    try {
      await getPublicTracking(' st123456789gh ');
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/shipments/track/ST123456789GH', expect.objectContaining({ method: 'GET' }));
    } finally {
      global.fetch = originalFetch;
    }
  });
});
