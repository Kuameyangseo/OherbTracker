'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="auth-page register-page">
      <section className="auth-intro" aria-label="Oherbtracker account overview">
        <div className="auth-intro-topline">
          <span className="auth-status-dot" />
          <span>One workspace, every mile</span>
        </div>
        <div className="auth-intro-copy">
          <p className="section-kicker">Start with clarity</p>
          <h1>Make every delivery easier to follow.</h1>
          <p className="auth-intro-lede">
            Create your workspace to centralize shipment updates, team handoffs, and the details that keep customers informed.
          </p>
        </div>
        <div className="auth-signal-list" aria-label="Account benefits">
          <div className="auth-signal">
            <span className="auth-signal-index">01</span>
            <span><strong>Built for momentum</strong><small>Move from label to delivery with confidence.</small></span>
          </div>
          <div className="auth-signal">
            <span className="auth-signal-index">02</span>
            <span><strong>Ready when you are</strong><small>Your tracking workspace starts here.</small></span>
          </div>
        </div>
      </section>

      <section className="auth-card" aria-labelledby="register-title">
        <div className="auth-card-heading">
          <div>
            <p className="auth-eyebrow">New workspace</p>
            <h2 id="register-title">Create account</h2>
          </div>
          <span className="auth-card-mark" aria-hidden="true">OT</span>
        </div>
        <p className="auth-card-subtitle">Set up your account in less than a minute.</p>

        <form className="auth-form auth-register-form" onSubmit={handleSubmit}>
          <label className="auth-field auth-field-wide">
            <span>Full name</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" autoComplete="name" required />
          </label>

          <label className="auth-field">
            <span>Email address</span>
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@company.com" autoComplete="email" required />
          </label>

          <label className="auth-field">
            <span>Phone <small>(optional)</small></span>
            <input type="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+1 555 000 0000" autoComplete="tel" />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="auth-check-row auth-field-wide">
            <input type="checkbox" checked={showPassword} onChange={() => setShowPassword((value) => !value)} />
            <span>Show passwords</span>
          </label>

          {error ? <div className="auth-error auth-field-wide" role="alert">{error}</div> : null}

          <button className="auth-submit auth-field-wide" type="submit" disabled={loading}>
            <span>{loading ? 'Creating account...' : 'Create my account'}</span>
            <span aria-hidden="true">-&gt;</span>
          </button>
        </form>

        <div className="auth-card-footer">
          <span>Already have an account?</span>
          <Link href="/login">Sign in</Link>
        </div>
        <p className="auth-security-note"><span aria-hidden="true">*</span> Your workspace stays private and protected.</p>
      </section>
    </main>
  );
}
