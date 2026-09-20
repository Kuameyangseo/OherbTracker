export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`loader loader-${size}`} aria-label="Loading" role="status" />;
}

export function PageLoading() {
  return (
    <section className="page-loading" aria-live="polite">
      <LoadingSpinner size="lg" />
      <span className="page-loading-label">Loading...</span>
    </section>
  );
}

export function CardSkeleton() {
  return (
    <section className="card-skeleton">
      <span className="skeleton-line skeleton-wide" />
      <span className="skeleton-line" />
      <span className="skeleton-line" />
    </section>
  );
}

export function TableSkeleton() {
  return (
    <section className="table-skeleton">
      <span className="skeleton-line skeleton-wide" />
      <span className="skeleton-line" />
      <span className="skeleton-line" />
    </section>
  );
}

export function ShipmentSkeleton() {
  return (
    <section className="shipment-skeleton">
      <span className="skeleton-line skeleton-wide" />
      <span className="skeleton-line" />
    </section>
  );
}
