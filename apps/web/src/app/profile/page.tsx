'use client';

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

  if (isLoading) return <p>Loading...</p>;
  if (!isAuthenticated || !user) return <p>Please log in to view this page.</p>;

  const save = (next: NotificationPreferenceUpdate) => {
    setSaveError(null);
    setIsSaving(true);
    void updateNotificationPreferences(next)
      .then((result) => setPreferences(result.preferences))
      .catch(() => setSaveError('Unable to save notification preferences. Please try again.'))
      .finally(() => setIsSaving(false));
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Profile</h1>
      <p>Name: {user.name ?? 'Not provided'}</p>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <h2>Notification preferences</h2>
      {saveError && <p role="alert">{saveError}</p>}
      {isSaving && <p aria-live="polite">Saving notification preferences...</p>}
      <label><input type="checkbox" checked={shipmentStatus} onChange={(event) => { const value = event.target.checked; setShipmentStatus(value); save({ inApp: { shipmentStatus: value } }); }} /> In-app notifications</label>
      <p>Receive shipment updates inside the application.</p>
      <label><input type="checkbox" checked={preferences?.email.shipmentStatus ?? true} onChange={(event) => save({ email: { shipmentStatus: event.target.checked } })} /> Email notifications</label>
      <p>Receive shipment updates by email.</p>
      <label><input type="checkbox" checked={preferences?.sms.shipmentStatus ?? false} onChange={(event) => save({ sms: { shipmentStatus: event.target.checked } })} /> SMS notifications</label>
      <p>Receive shipment updates by SMS.</p>
    </main>
  );
}
