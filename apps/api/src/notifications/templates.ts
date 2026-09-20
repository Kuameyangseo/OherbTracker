import { serverConfig } from '@oherb-tracker/config';
import { ShipmentStatus } from '@oherb-tracker/shared-types';

export type ShipmentNotificationTemplate = {
  subject: string;
  text: string;
  html: string;
  sms: string;
};

export function shipmentTrackingUrl(trackingNumber: string): string {
  return `${serverConfig.webUrl.replace(/\/$/, '')}/track/${encodeURIComponent(trackingNumber)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function shipmentTemplate(title: string, message: string, trackingNumber: string, status: ShipmentStatus, location?: string): ShipmentNotificationTemplate {
  const trackingUrl = shipmentTrackingUrl(trackingNumber);
  const safeLocation = location ? ` Current location: ${location}.` : '';
  const text = `${serverConfig.appName}: ${title}\n\n${message}${safeLocation}\nTracking number: ${trackingNumber}\nStatus: ${status}\nTrack shipment: ${trackingUrl}`;
  const html = `<p><strong>${escapeHtml(serverConfig.appName)}</strong></p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}${escapeHtml(safeLocation)}</p><p>Tracking number: ${escapeHtml(trackingNumber)}<br>Status: ${escapeHtml(status)}</p><p><a href="${escapeHtml(trackingUrl)}">Track shipment</a></p>`;
  return { subject: `${serverConfig.appName}: ${title}`, text, html, sms: `${message} Tracking: ${trackingNumber}.` };
}
