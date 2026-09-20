'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Input, Label } from '../ui/forms';
import { Button } from '../ui/forms';
import { ErrorMessage } from '../ui/errors';
import { normalizeTrackingNumber, isValidTrackingNumber } from '../../lib/api-client';

export function TrackingSearchForm({ initialValue = '', className = '' }: { initialValue?: string; className?: string }) {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState(initialValue);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeTrackingNumber(trackingNumber);

    if (!normalized) {
      setError('Please enter a valid tracking number.');
      return;
    }

    if (!isValidTrackingNumber(normalized)) {
      setError('Please enter a valid tracking number.');
      return;
    }

    setError('');
    setLoading(true);
    router.push(`/track/${encodeURIComponent(normalized)}`);
    setLoading(false);
  }

  return (
    <form className={`tracking-search-form ${className}`.trim()} onSubmit={handleSubmit} noValidate>
      <Label htmlFor="tracking-search-grid" className="sr-only">Tracking Number</Label>
      <div className="tracking-form-grid">
        <Input
          id="tracking-search-grid"
          name="trackingNumber"
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ST123456789GH"
          aria-label="Tracking Number"
          aria-invalid={Boolean(error)}
          error={Boolean(error)}
        />
        <Button type="submit" className="track-submit-button" disabled={loading} loading={loading}>
          {loading ? 'Checking shipment...' : 'Track Shipment'}
        </Button>
      </div>
      {error ? <ErrorMessage message={error} /> : null}
    </form>
  );
}
