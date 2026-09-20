import crypto from 'node:crypto';

export function generatePackageNumber(date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replaceAll('-', '');
  const sequencePart = crypto
    .randomInt(0, 1_000_000)
    .toString()
    .padStart(6, '0');
  return `PKG-${datePart}-${sequencePart}`;
}
