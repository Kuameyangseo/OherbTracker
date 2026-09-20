'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '../../components/auth/auth-context';
import { registerUser } from '../../lib/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      await refreshUser();
      router.push('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 500, margin: '4rem auto', padding: '1.5rem' }}>
      <h1>Create account</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </label>

        <label>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
        </label>

        <label>
          <span>Phone</span>
          <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
          />
        </label>

        <label>
          <span>Confirm password</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            required
          />
        </label>

        {error ? <div role="alert">{error}</div> : null}

        <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
        <a href="/login">Already have an account? Login</a>
      </form>
    </main>
  );
}
