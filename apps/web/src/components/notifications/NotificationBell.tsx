'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getUnreadNotificationCount, type Notification } from '../../lib/api-client';
import { useNotificationRealtime } from '../../lib/socket/socket-client';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<Notification | null>(null);
  const receivedIds = useRef(new Set<string>());
  const refresh = () => void getUnreadNotificationCount().then((result) => setCount(result.unreadCount)).catch(() => undefined);
  useEffect(refresh, []);
  useNotificationRealtime((notification) => {
    if (receivedIds.current.has(notification.id)) return;
    receivedIds.current.add(notification.id);
    setLatest(notification);
    setCount((value) => value + 1);
  });
  return <div className="notification-bell-wrap">
    <button className="notification-bell" type="button" aria-label={`Notifications${count ? `, ${count} unread` : ''}`} onClick={() => { setOpen((value) => !value); refresh(); }}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" focusable="false">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
      {count > 0 ? <b aria-hidden="true">{count > 99 ? '99+' : count}</b> : null}
    </button>
    {open ? <NotificationDropdown latest={latest} onRead={refresh} /> : null}
    <Link className="notification-view-link" href="/notifications">View all</Link>
  </div>;
}
