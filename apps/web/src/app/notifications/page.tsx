'use client';
import { useEffect, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from '../../lib/api-client';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { useNotificationRealtime } from '../../lib/socket/socket-client';
export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = () => { setLoading(true); setError(''); void listNotifications().then((result) => setItems(result.notifications)).catch(() => setError('We could not load your notifications.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  useNotificationRealtime((notification) => setItems((current) => current.some((item) => item.id === notification.id) ? current : [notification, ...current]));
  if (loading) return <main className="page-container"><p>Loading notifications...</p></main>;
  return <main className="page-container"><div className="page-heading"><h1>Notifications</h1><button className="nav-button" type="button" onClick={() => void markAllNotificationsRead().then(load)}>Mark all as read</button></div>
    {error ? <section className="error-card"><p>{error}</p><button className="nav-button" type="button" onClick={load}>Try again</button></section> : null}
    {!error && items.length ? items.map((item) => <NotificationItem key={item.id} notification={item} onRead={() => void markNotificationRead(item.id).then(load)} />) : null}
    {!error && !items.length ? <p>No notifications yet.</p> : null}</main>;
}
