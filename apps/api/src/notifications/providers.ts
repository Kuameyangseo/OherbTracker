import { serverConfig } from '@oherb-tracker/config';

export type EmailMessage = {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
};

export type SmsMessage = {
  to: string;
  body: string;
};

export type DeliveryResult = {
  accepted: boolean;
  provider: string;
  messageId?: string;
  errorCode?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<DeliveryResult>;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<DeliveryResult>;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPhone(value: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(value.replace(/[\s()-]/g, ''));
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<DeliveryResult> {
    if (!validEmail(message.to) || !message.subject.trim() || !message.text.trim()) {
      return { accepted: false, provider: 'console', errorCode: 'INVALID_EMAIL_MESSAGE' };
    }
    console.log('[notification] development email delivery', {
      provider: 'console',
      to: message.to,
      subject: message.subject,
    });
    return { accepted: false, provider: 'console', errorCode: 'DEVELOPMENT_PROVIDER' };
  }
}

export class ConsoleSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<DeliveryResult> {
    if (!validPhone(message.to) || !message.body.trim()) {
      return { accepted: false, provider: 'console', errorCode: 'INVALID_SMS_MESSAGE' };
    }
    console.log('[notification] development SMS delivery', {
      provider: 'console',
      to: message.to,
      body: message.body,
    });
    return { accepted: false, provider: 'console', errorCode: 'DEVELOPMENT_PROVIDER' };
  }
}

export class DisabledEmailProvider implements EmailProvider {
  async send(_message: EmailMessage): Promise<DeliveryResult> {
    return { accepted: false, provider: 'disabled', errorCode: 'PROVIDER_DISABLED' };
  }
}

export class DisabledSmsProvider implements SmsProvider {
  async send(_message: SmsMessage): Promise<DeliveryResult> {
    return { accepted: false, provider: 'disabled', errorCode: 'PROVIDER_DISABLED' };
  }
}

export function createEmailProvider(): EmailProvider {
  return serverConfig.emailProvider === 'disabled' ? new DisabledEmailProvider() : new ConsoleEmailProvider();
}

export function createSmsProvider(): SmsProvider {
  return serverConfig.smsProvider === 'disabled' ? new DisabledSmsProvider() : new ConsoleSmsProvider();
}

export { validEmail, validPhone };
