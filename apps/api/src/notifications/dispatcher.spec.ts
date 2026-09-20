import { describe, expect, it, jest } from '@jest/globals';
import { Notification } from '@oherb-tracker/database';
import { ShipmentStatus } from '@oherb-tracker/shared-types';
import type { EmailProvider, SmsProvider } from './providers.js';
import { dispatchNotification, type DispatchInput } from './dispatcher.js';

const input: DispatchInput = {
  notificationId: 'notification-1',
  userId: 'user-1',
  email: 'customer@example.com',
  phone: '+233201234567',
  title: 'Shipment delivered',
  message: 'Your shipment ST123 is delivered.',
  trackingNumber: 'ST123',
  status: ShipmentStatus.DELIVERED,
  emailEnabled: true,
  smsEnabled: true,
};

function fakeEmail(send: EmailProvider['send']): EmailProvider {
  return { send };
}

function fakeSms(send: SmsProvider['send']): SmsProvider {
  return { send };
}

describe('notification dispatcher', () => {
  it('sends enabled email and SMS channels and records successful metadata', async () => {
    const updates: unknown[] = [];
    const update = jest.spyOn(Notification, 'findByIdAndUpdate').mockImplementation((async (_id: unknown, operation: unknown) => {
      updates.push(operation);
      return null;
    }) as typeof Notification.findByIdAndUpdate);
    const emailSend = jest.fn<EmailProvider['send']>().mockResolvedValue({ accepted: true, provider: 'fake-email' });
    const smsSend = jest.fn<SmsProvider['send']>().mockResolvedValue({ accepted: true, provider: 'fake-sms' });

    await dispatchNotification(input, { emailProvider: fakeEmail(emailSend), smsProvider: fakeSms(smsSend) });

    expect(emailSend).toHaveBeenCalledWith(expect.objectContaining({ to: input.email, subject: expect.stringContaining(input.title) }));
    expect(smsSend).toHaveBeenCalledWith(expect.objectContaining({ to: input.phone }));
    expect(updates).toEqual(expect.arrayContaining([
      { $set: { 'delivery.email': expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }) } },
      { $set: { 'delivery.sms': expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) }) } },
    ]));
    update.mockRestore();
  });

  it('skips disabled channels and missing recipients without calling providers', async () => {
    const update = jest.spyOn(Notification, 'findByIdAndUpdate').mockResolvedValue(null);
    const emailSend = jest.fn<EmailProvider['send']>();
    const smsSend = jest.fn<SmsProvider['send']>();

    await dispatchNotification(
      { ...input, email: undefined, phone: undefined, emailEnabled: false, smsEnabled: true },
      { emailProvider: fakeEmail(emailSend), smsProvider: fakeSms(smsSend) },
    );

    expect(emailSend).not.toHaveBeenCalled();
    expect(smsSend).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(input.notificationId, { $set: { 'delivery.email': { status: 'skipped', errorCode: 'NO_RECIPIENT_OR_DISABLED' } } });
    expect(update).toHaveBeenCalledWith(input.notificationId, { $set: { 'delivery.sms': { status: 'skipped', errorCode: 'NO_RECIPIENT_OR_DISABLED' } } });
    update.mockRestore();
  });

  it('isolates provider failures and records failed metadata for only the failed channel', async () => {
    const updates: unknown[] = [];
    const update = jest.spyOn(Notification, 'findByIdAndUpdate').mockImplementation((async (_id: unknown, operation: unknown) => {
      updates.push(operation);
      return null;
    }) as typeof Notification.findByIdAndUpdate);
    const emailSend = jest.fn<EmailProvider['send']>().mockRejectedValue(new Error('fake email outage'));
    const smsSend = jest.fn<SmsProvider['send']>().mockResolvedValue({ accepted: true, provider: 'fake-sms' });

    await expect(dispatchNotification(input, { emailProvider: fakeEmail(emailSend), smsProvider: fakeSms(smsSend) })).resolves.toBeUndefined();

    expect(updates).toEqual(expect.arrayContaining([
      { $set: { 'delivery.email': expect.objectContaining({ status: 'failed', errorCode: 'PROVIDER_ERROR' }) } },
      { $set: { 'delivery.sms': expect.objectContaining({ status: 'sent' }) } },
    ]));
    update.mockRestore();
  });
});
