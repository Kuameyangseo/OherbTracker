import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-container">
      <section className="empty-state">
        <h1>Page not found</h1>
        <p>The page you requested could not be found.</p>
        <Link className="form-button" href="/">Return home</Link>
      </section>
    </main>
  );
}
