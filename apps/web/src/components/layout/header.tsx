'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { NotificationBell } from '../notifications/NotificationBell';

const navLinks = [
  { href: '/tracking', label: 'Track Shipment' },
  { href: '/shipments', label: 'Shipments' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
];

export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="Oherbtracker home">
          <span className="brand-mark">OT</span>
          <span className="brand-copy">
            <span className="brand-name">Oherbtracker</span>
            <span className="brand-tag">Logistics</span>
          </span>
        </Link>

        <button className="mobile-menu-button" type="button" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
          <span />
          <span />
          <span />
        </button>

        <nav className={`primary-nav ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
          <Link className="nav-link" href="/track">
            Track Shipment
          </Link>
          {isAuthenticated ? (
            <>
              <Link className="nav-link" href="/shipments">
                Shipments
              </Link>
              <Link className="nav-link" href="/dashboard">
                Dashboard
              </Link>
              <Link className="nav-link" href="/profile">
                Profile
              </Link>
              <NotificationBell />
              {user && (user.role === 'STAFF' || user.role === 'ADMIN') ? (
                <>
                  <Link className="nav-link" href="/admin">
                    Operations
                  </Link>
                  <Link className="nav-link" href="/admin/analytics">
                    Analytics
                  </Link>
                </>
              ) : null}
              <span className="header-user" aria-label={user?.email ?? 'Authenticated user'}>{user?.email ?? 'Account'}</span>
              <button className="nav-button" type="button" onClick={() => void logout()} disabled={isLoading}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link" href="/login">
                Login
              </Link>
              <Link className="nav-link nav-cta" href="/register">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
