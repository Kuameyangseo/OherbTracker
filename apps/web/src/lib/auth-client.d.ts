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

export function registerUser(input: { name: string; email: string; password: string; phone?: string }): Promise<{ user: AuthUser }>;
export function loginUser(input: { email: string; password: string }): Promise<{ user: AuthUser }>;
export function logoutUser(): Promise<{ loggedOut: boolean }>;
export function getCurrentUser(): Promise<{ user: AuthUser }>;
