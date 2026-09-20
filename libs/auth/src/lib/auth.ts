import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';

export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const TOKEN_SEPARATOR = '.';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken(payload: AuthenticatedUser, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createSignature(`${header}${TOKEN_SEPARATOR}${body}`, secret);

  return `${header}${TOKEN_SEPARATOR}${body}${TOKEN_SEPARATOR}${signature}`;
}

export function verifySessionToken<T extends AuthenticatedUser>(token: string, secret: string): T {
  const parts = token.split(TOKEN_SEPARATOR);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Invalid session token');
  }

  const [header, payload, signature] = parts;
  const expected = createSignature(`${header}${TOKEN_SEPARATOR}${payload}`, secret);

  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid session token');
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  return decoded;
}

export function serializeAuthCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    httpOnly?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    secure?: boolean;
  } = {},
): string {
  const maxAge = options.maxAge ?? 60 * 60 * 24 * 7;
  const cookieValue = encodeURIComponent(value);
  const parts = [`${name}=${cookieValue}`, `Path=${options.path ?? '/'}`, `Max-Age=${maxAge}`];

  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite.toLowerCase()}`);
  if (options.secure) parts.push('Secure');

  return parts.join('; ');
}

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  if (!request.user) {
    console.error('[auth] authentication required', {
      method: request.method,
      path: request.originalUrl,
    });
    response.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
    return;
  }

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const user = request.user;

    if (!user || !roles.includes(user.role as UserRole)) {
      response.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions.' },
      });
      return;
    }

    next();
  };
}

function createSignature(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}
