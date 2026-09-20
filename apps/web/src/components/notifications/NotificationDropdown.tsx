'use client';
import { useEffect, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead, type Notification } from '../../lib/api-client';
import { NotificationItem } from './NotificationItem';

export function NotificationDropdown({ latest, onRead }: { latest: Notification | null; onRead: () => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { void listNotifications(1, 5).then((result) => setItems(result.notifications)).catch(() => undefined); }, [latest]);
  return <div className="notification-dropdown" role="dialog" aria-label="Notifications">
    <div className="notification-dropdown-head"><strong>Notifications</strong><button type="button" onClick={() => void markAllNotificationsRead().then(() => { setItems((values) => values.map((item) => ({ ...item, isRead: true }))); onRead(); })}>Mark all as read</button></div>
    {items.length ? items.map((item) => <NotificationItem key={item.id} notification={item} onRead={() => { void markNotificationRead(item.id).then(() => { setItems((values) => values.map((value) => value.id === item.id ? { ...value, isRead: true } : value)); onRead(); }); }} />) : <p className="notification-empty">No notifications yet.</p>}
  </div>;
}
