export function ErrorMessage({ message }: { message: string }) {
  return <div className="error-message" role="alert">{message}</div>;
}

export function ErrorCard({ title = 'Something went wrong', message = 'Please try again.' }: { title?: string; message?: string }) {
  return (
    <section className="error-card">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function NotFoundState({ title = 'Not found', message = 'The requested page or shipment could not be found.' }: { title?: string; message?: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function UnauthorizedState({ title = 'Unauthorized', message = 'You need to sign in to continue.' }: { title?: string; message?: string }) {
  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function ServerErrorState({ title = 'Server error', message = 'The service is temporarily unavailable.' }: { title?: string; message?: string }) {
  return (
    <section className="error-card">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
