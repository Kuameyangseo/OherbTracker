export type AuthRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
  name?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Request failed');
  }

  return (payload.data ?? ({} as T)) as T;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return apiRequest<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginUser(input: { email: string; password: string }) {
  return apiRequest<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutUser() {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return apiRequest<{ user: AuthUser }>('/api/auth/me', {
    method: 'GET',
  });
}
