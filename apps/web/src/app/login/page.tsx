'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useAuth } from '../../components/auth/auth-context';
import { loginUser } from '../../lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginUser({ email, password });
      await refreshUser();
      router.push('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="Oherbtracker overview">
        <div className="auth-intro-topline">
          <span className="auth-status-dot" />
          <span>Operations platform</span>
        </div>
        <div className="auth-intro-copy">
          <p className="section-kicker">Welcome back</p>
          <h1>Every shipment, clearly in view.</h1>
          <p className="auth-intro-lede">
            Sign in to follow active deliveries, review milestones, and keep your next handoff moving.
          </p>
        </div>
        <div className="auth-signal-list" aria-label="Platform features">
          <div className="auth-signal">
            <span className="auth-signal-index">01</span>
            <span><strong>Live visibility</strong><small>See progress across every route.</small></span>
          </div>
          <div className="auth-signal">
            <span className="auth-signal-index">02</span>
            <span><strong>Clear handoffs</strong><small>Keep your team aligned at each mile.</small></span>
          </div>
        </div>
      </section>

      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card-heading">
          <div>
            <p className="auth-eyebrow">Account access</p>
            <h2 id="login-title">Sign in</h2>
          </div>
          <span className="auth-card-mark" aria-hidden="true">OT</span>
        </div>
        <p className="auth-card-subtitle">Use your Oherbtracker credentials to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email address</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <span className="auth-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          <label className="auth-check-row">
            <input type="checkbox" checked={showPassword} onChange={() => setShowPassword((value) => !value)} />
            <span>Show password</span>
          </label>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            <span>{loading ? 'Signing in...' : 'Continue to dashboard'}</span>
            <span aria-hidden="true">-&gt;</span>
          </button>
        </form>

        <div className="auth-card-footer">
          <span>New to Oherbtracker?</span>
          <Link href="/register">Create an account</Link>
        </div>
        <p className="auth-security-note"><span aria-hidden="true">*</span> Your workspace stays private and protected.</p>
      </section>
    </main>
  );
}
