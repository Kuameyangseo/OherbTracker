import { apiRequest } from './api-client';

export type AuthRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
  name?: string;
};

export async function getCurrentUser() {
  return apiRequest<{ user: AuthUser }>('/api/auth/me', { method: 'GET' });
}

export async function login(input: { email: string; password: string }) {
  return apiRequest<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout() {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function register(input: { name: string; email: string; password: string; phone?: string }) {
  return apiRequest<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
