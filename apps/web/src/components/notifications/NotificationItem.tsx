import type { Notification } from '../../lib/api-client';
import Link from 'next/link';
export function NotificationItem({ notification, onRead }: { notification: Notification; onRead: () => void }) {
  return <div className={`notification-item ${notification.isRead ? '' : 'unread'}`} role="article" aria-label={notification.isRead ? undefined : 'Unread notification'}>
    <button type="button" onClick={onRead}><strong>{notification.title}</strong><span>{notification.message}</span><small>{new Date(notification.createdAt).toLocaleString()}</small></button>
    {notification.shipmentId ? <Link href={`/shipments/${notification.shipmentId}`} onClick={onRead}>View shipment</Link> : null}
  </div>;
}
