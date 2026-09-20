import { Notification, User } from '@oherb-tracker/database';
import { NotificationChannel, ShipmentStatus } from '@oherb-tracker/shared-types';
import { serverConfig } from '@oherb-tracker/config';
import { createEmailProvider, createSmsProvider, type DeliveryResult } from './providers.js';
import { shipmentTemplate } from './templates.js';

export type DispatchInput = {
  notificationId: string;
  userId: string;
  email?: string;
  phone?: string;
  title: string;
  message: string;
  trackingNumber: string;
  status: ShipmentStatus;
  location?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
};

type DeliveryState = { status: 'sent' | 'failed' | 'skipped'; sentAt?: Date; failedAt?: Date; errorCode?: string };
type DispatcherProviders = {
  emailProvider?: ReturnType<typeof createEmailProvider>;
  smsProvider?: ReturnType<typeof createSmsProvider>;
};

function state(result: DeliveryResult): DeliveryState {
  return result.accepted
    ? { status: 'sent', sentAt: new Date() }
    : { status: 'failed', failedAt: new Date(), errorCode: result.errorCode ?? 'DELIVERY_REJECTED' };
}

async function updateDelivery(notificationId: string, channel: 'email' | 'sms', value: DeliveryState): Promise<void> {
  await Notification.findByIdAndUpdate(notificationId, { $set: { [`delivery.${channel}`]: value } });
}

export async function dispatchNotification(input: DispatchInput, providers: DispatcherProviders = {}): Promise<void> {
  const template = shipmentTemplate(input.title, input.message, input.trackingNumber, input.status, input.location);
  const emailProvider = providers.emailProvider ?? createEmailProvider();
  const smsProvider = providers.smsProvider ?? createSmsProvider();
  const tasks: Promise<void>[] = [];
  if (input.emailEnabled && input.email) {
    tasks.push(
      emailProvider.send({ to: input.email, from: serverConfig.emailFrom, subject: template.subject, text: template.text, html: template.html })
        .then((result) => updateDelivery(input.notificationId, 'email', state(result)))
        .catch(async () => updateDelivery(input.notificationId, 'email', { status: 'failed', failedAt: new Date(), errorCode: 'PROVIDER_ERROR' })),
    );
  } else {
    tasks.push(updateDelivery(input.notificationId, 'email', { status: 'skipped', errorCode: 'NO_RECIPIENT_OR_DISABLED' }));
  }
  if (input.smsEnabled && input.phone) {
    tasks.push(
      smsProvider.send({ to: input.phone, body: template.sms })
        .then((result) => updateDelivery(input.notificationId, 'sms', state(result)))
        .catch(async () => updateDelivery(input.notificationId, 'sms', { status: 'failed', failedAt: new Date(), errorCode: 'PROVIDER_ERROR' })),
    );
  } else {
    tasks.push(updateDelivery(input.notificationId, 'sms', { status: 'skipped', errorCode: 'NO_RECIPIENT_OR_DISABLED' }));
  }
  await Promise.all(tasks);
}

export async function dispatchShipmentNotification(input: Omit<DispatchInput, 'email' | 'phone' | 'emailEnabled' | 'smsEnabled'>): Promise<void> {
  const user = await User.findById(input.userId).select('email phone notificationPreferences').lean();
  if (!user) return;
  const preferences = user.notificationPreferences;
  await dispatchNotification({
    ...input,
    email: user.email,
    phone: user.phone ?? undefined,
    emailEnabled: preferences?.email?.shipmentStatus !== false,
    smsEnabled: preferences?.sms?.shipmentStatus === true,
  });
}

export { NotificationChannel };
