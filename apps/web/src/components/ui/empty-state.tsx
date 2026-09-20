import type { ReactNode } from 'react';

export function EmptyState({ title = 'No shipments found', description = "You don't have any shipments yet.", action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {action ?? null}
    </section>
  );
}
