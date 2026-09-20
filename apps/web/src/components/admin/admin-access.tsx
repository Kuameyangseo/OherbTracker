'use client';

import { ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import { PageContainer } from '../layout/page-container';
import { UnauthorizedState } from '../ui/errors';
import { PageLoading } from '../ui/loading';

export function AdminAccess({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoading />;
  if (!isAuthenticated || !user) {
    return <PageContainer><UnauthorizedState title="Sign in required" message="Sign in with a staff or administrator account to continue." /></PageContainer>;
  }
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return <PageContainer><UnauthorizedState title="Access denied" message="You do not have permission to view operations pages." /></PageContainer>;
  }
  return <>{children}</>;
}
