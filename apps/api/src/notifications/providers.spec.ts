import { describe, expect, it, jest } from '@jest/globals';
import { ConsoleEmailProvider, ConsoleSmsProvider, validEmail, validPhone } from './providers.js';

describe('notification development providers', () => {
  it('validates email and phone recipients', () => {
    expect(validEmail('customer@example.com')).toBe(true);
    expect(validEmail('not-an-email')).toBe(false);
    expect(validPhone('+233 20 123 4567')).toBe(true);
    expect(validPhone('not-a-phone')).toBe(false);
  });

  it('does not claim console email delivery', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(new ConsoleEmailProvider().send({
      to: 'customer@example.com',
      subject: 'Shipment update',
      text: 'Your shipment is delivered.',
    })).resolves.toMatchObject({ accepted: false, provider: 'console', errorCode: 'DEVELOPMENT_PROVIDER' });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('rejects invalid SMS messages without sending', async () => {
    await expect(new ConsoleSmsProvider().send({ to: 'invalid', body: 'Update' }))
      .resolves.toMatchObject({ accepted: false, errorCode: 'INVALID_SMS_MESSAGE' });
  });
});
