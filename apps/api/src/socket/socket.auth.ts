import type { IncomingHttpHeaders } from 'node:http';
import { verifySessionToken, type AuthenticatedUser } from '@oherb-tracker/auth';
import { serverConfig } from '@oherb-tracker/config';

function cookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  return cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function authenticateSocket(handshake: { headers: IncomingHttpHeaders }): AuthenticatedUser {
  const token = cookieValue(handshake.headers.cookie, serverConfig.authCookieName);
  if (!token) throw new Error('Authentication required.');
  try {
    return verifySessionToken(token, serverConfig.authSecret);
  } catch {
    throw new Error('Authentication required.');
  }
}
