'use client';

import { useState } from 'react';

export function TrackingNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="tracking-number">
      <span className="tracking-number-value" aria-label="Tracking number">
        {value}
      </span>
      <button className="tracking-number-copy" type="button" onClick={() => void handleCopy()} aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}
