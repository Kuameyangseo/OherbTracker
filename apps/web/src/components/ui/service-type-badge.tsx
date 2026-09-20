const serviceTypeLabels: Record<string, string> = {
  STANDARD: 'Standard',
  EXPRESS: 'Express',
  OVERNIGHT: 'Overnight',
};

export function ServiceTypeBadge({ type }: { type: string }) {
  return <span className="service-type-badge">{serviceTypeLabels[type] ?? type}</span>;
}
