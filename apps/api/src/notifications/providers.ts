import { serverConfig } from '@oherb-tracker/config';
import nodemailer from 'nodemailer';

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

export class SmtpEmailProvider implements EmailProvider {
  private readonly transport = nodemailer.createTransport({
    ...(serverConfig.smtpService ? { service: serverConfig.smtpService } : {}),
    ...(serverConfig.smtpHost ? { host: serverConfig.smtpHost } : {}),
    port: serverConfig.smtpPort,
    secure: serverConfig.smtpPort === 465,
    auth: serverConfig.smtpUser && serverConfig.smtpPass
      ? { user: serverConfig.smtpUser, pass: serverConfig.smtpPass }
      : undefined,
  });

  async send(message: EmailMessage): Promise<DeliveryResult> {
    if (!validEmail(message.to) || !message.subject.trim() || !message.text.trim()) {
      return { accepted: false, provider: 'smtp', errorCode: 'INVALID_EMAIL_MESSAGE' };
    }
    if (!serverConfig.smtpUser || !serverConfig.smtpPass) {
      return { accepted: false, provider: 'smtp', errorCode: 'SMTP_NOT_CONFIGURED' };
    }

    try {
      const result = await this.transport.sendMail({
        from: message.from ?? serverConfig.emailFrom,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      return {
        accepted: result.accepted.length > 0,
        provider: 'smtp',
        messageId: result.messageId,
      };
    } catch (error) {
      return {
        accepted: false,
        provider: 'smtp',
        errorCode: error instanceof Error ? error.name : 'SMTP_SEND_FAILED',
      };
    }
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
  if (serverConfig.emailProvider === 'disabled') return new DisabledEmailProvider();
  if (serverConfig.emailProvider === 'smtp') return new SmtpEmailProvider();
  return new ConsoleEmailProvider();
}

export function createSmsProvider(): SmsProvider {
  return serverConfig.smsProvider === 'disabled' ? new DisabledSmsProvider() : new ConsoleSmsProvider();
}

export { validEmail, validPhone };
