import { describe, expect, it } from '@jest/globals';
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from './auth.js';

describe('auth helpers', () => {
  it('hashes and verifies a password', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword', hash)).resolves.toBe(false);
  });

  it('creates and verifies a signed session token', () => {
    const payload = { id: 'abc123', email: 'user@example.com', role: 'CUSTOMER' as const };
    const token = createSessionToken(payload, 'test-secret');

    expect(token).toContain('.');
    expect(verifySessionToken(token, 'test-secret')).toEqual(payload);
    expect(() => verifySessionToken(`${token}x`, 'test-secret')).toThrow();
  });
});
