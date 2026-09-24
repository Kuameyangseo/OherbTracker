'use client';

import Link from 'next/link';
import { useAuth } from '../../components/auth/auth-context';
import { useEffect, useState } from 'react';
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferenceUpdate, type NotificationPreferences } from '../../lib/api-client';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [shipmentStatus, setShipmentStatus] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (isAuthenticated) void getNotificationPreferences().then((result) => {
      setPreferences(result.preferences);
      setShipmentStatus(result.preferences.inApp.shipmentStatus);
    });
  }, [isAuthenticated]);

  if (isLoading) return <main className="profile-page"><p className="profile-loading">Loading your profile...</p></main>;
  if (!isAuthenticated || !user) return (
    <main className="profile-page profile-gateway">
      <section className="profile-gateway-intro" aria-label="Profile overview">
        <span className="admin-heading-kicker"><span className="admin-live-dot" /> Account / Profile</span>
        <h1>Your profile, in one clear place.</h1>
        <p>Keep your account details close and choose exactly how shipment updates reach you.</p>
        <div className="profile-gateway-signals">
          <div><span>01</span><strong>Account details</strong><small>Keep your workspace identity up to date.</small></div>
          <div><span>02</span><strong>Shipment alerts</strong><small>Control in-app, email, and SMS updates.</small></div>
        </div>
      </section>
      <section className="profile-empty" aria-labelledby="profile-gateway-title">
        <span className="profile-avatar">OT</span>
        <span className="profile-overline">Private workspace</span>
        <h2 id="profile-gateway-title">Sign in to your profile</h2>
        <p>Your profile and notification preferences are available when you are signed in.</p>
        <div className="profile-gateway-actions"><Link className="auth-submit" href="/login">Sign in <span aria-hidden="true">-&gt;</span></Link><Link className="profile-secondary-action" href="/register">Create an account</Link></div>
      </section>
    </main>
  );

  const save = (next: NotificationPreferenceUpdate) => {
    setSaveError(null);
    setIsSaving(true);
    void updateNotificationPreferences(next)
      .then((result) => setPreferences(result.preferences))
      .catch(() => setSaveError('Unable to save notification preferences. Please try again.'))
      .finally(() => setIsSaving(false));
  };

  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase();
  const preferenceCards = [
    { key: 'inApp' as const, title: 'In-app updates', description: 'See shipment milestones and delivery changes inside your workspace.', enabled: shipmentStatus, update: (value: boolean) => { setShipmentStatus(value); save({ inApp: { shipmentStatus: value } }); } },
    { key: 'email' as const, title: 'Email updates', description: 'Receive important shipment status changes at your account email.', enabled: preferences?.email.shipmentStatus ?? true, update: (value: boolean) => save({ email: { shipmentStatus: value } }) },
    { key: 'sms' as const, title: 'SMS updates', description: 'Get time-sensitive shipment notifications by text message.', enabled: preferences?.sms.shipmentStatus ?? false, update: (value: boolean) => save({ sms: { shipmentStatus: value } }) },
  ];

  return (
    <main className="profile-page">
      <header className="profile-heading">
        <div><span className="admin-heading-kicker"><span className="admin-live-dot" /> Account / Profile</span><h1>Your profile</h1><p>Manage your identity and how Oherbtracker keeps you informed.</p></div>
        <span className="auth-card-mark" aria-hidden="true">OT</span>
      </header>

      <section className="profile-identity" aria-label="Account details">
        <div className="profile-identity-main"><span className="profile-avatar">{initials}</span><div><span className="profile-overline">Signed-in account</span><h2>{user.name ?? 'Oherbtracker user'}</h2><p>{user.email}</p></div></div>
        <div className="profile-meta"><div><span>Role</span><strong>{user.role}</strong></div><div><span>Account status</span><strong><i className="profile-status-dot" /> Active</strong></div></div>
      </section>

      <section className="profile-preferences" aria-labelledby="notification-heading">
        <div className="profile-section-heading"><div><span className="section-kicker">Stay in the loop</span><h2 id="notification-heading">Notification preferences</h2><p>Choose where you want to receive shipment updates. Changes save automatically.</p></div>{isSaving ? <span className="profile-saving" aria-live="polite">Saving...</span> : null}</div>
        {saveError ? <div className="auth-error" role="alert">{saveError}</div> : null}
        <div className="profile-preference-grid">{preferenceCards.map((card) => <article className={`profile-preference-card ${card.enabled ? 'is-enabled' : ''}`} key={card.key}><div className="profile-preference-icon" aria-hidden="true">{card.key === 'inApp' ? '01' : card.key === 'email' ? '02' : '03'}</div><div className="profile-preference-copy"><h3>{card.title}</h3><p>{card.description}</p></div><label className="profile-toggle"><input type="checkbox" checked={card.enabled} onChange={(event) => card.update(event.target.checked)} /><span aria-hidden="true" /><b>{card.enabled ? 'On' : 'Off'}</b></label></article>)}</div>
      </section>
    </main>
  );
}
