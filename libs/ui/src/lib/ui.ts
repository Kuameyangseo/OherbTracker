import {
  createElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useState,
} from 'react';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ children, variant = 'default', size = 'md', loading = false, disabled, type = 'button', ...props }: ButtonProps) {
  return createElement(
    'button',
    {
      ...props,
      type,
      disabled: disabled || loading,
      className: ['ui-button', `ui-button-${variant}`, `ui-button-${size}`, props.className ?? ''].filter(Boolean).join(' '),
    },
    loading ? createElement('span', { className: 'ui-button-loading' }, 'Loading...') : children,
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function Input({ error = false, className = '', ...props }: InputProps) {
  return createElement('input', {
    ...props,
    className: ['ui-input', error ? 'ui-input-error' : '', className].filter(Boolean).join(' '),
  });
}

export type TextareaProps = InputHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export function Textarea({ error = false, className = '', ...props }: TextareaProps) {
  return createElement('textarea', {
    ...props,
    className: ['ui-textarea', error ? 'ui-input-error' : '', className].filter(Boolean).join(' '),
  });
}

export type SelectProps = InputHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

export function Select({ error = false, className = '', children, ...props }: SelectProps) {
  return createElement(
    'select',
    {
      ...props,
      className: ['ui-input', error ? 'ui-input-error' : '', className].filter(Boolean).join(' '),
    },
    children,
  );
}

export type LabelProps = HTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function Label({ children, className = '', ...props }: LabelProps) {
  return createElement('label', { ...props, className: ['ui-label', className].filter(Boolean).join(' ') }, children);
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return createElement('section', { ...props, className: ['ui-card', className].filter(Boolean).join(' ') }, children);
}

export function Badge({ children, className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return createElement('span', { ...props, className: ['ui-badge', className].filter(Boolean).join(' ') }, children);
}

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: 'info' | 'success' | 'warn' | 'danger';
};

export function Alert({ children, className = '', tone = 'info', ...props }: AlertProps) {
  return createElement('div', { ...props, className: ['ui-alert', `ui-alert-${tone}`, className].filter(Boolean).join(' ') }, children);
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return createElement('span', { className: ['ui-spinner', `ui-spinner-${size}`].join(' '), 'aria-label': 'Loading' });
}

export function PageLoading() {
  return createElement('div', { className: 'ui-page-loading' }, createElement(LoadingSpinner, { size: 'lg' }), createElement('span', { className: 'ui-page-loading-copy' }, 'Loading...'));
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return createElement(
    'div',
    { className: 'ui-skeleton-card' },
    createElement('div', { className: 'ui-skeleton-line ui-skeleton-line-wide' }),
    Array.from({ length: lines }).map((_, index) => createElement('div', { className: 'ui-skeleton-line', key: index })),
  );
}

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return createElement(
    'div',
    { className: 'ui-table-skeleton' },
    Array.from({ length: rows }).map((_, index) => createElement('div', { className: 'ui-skeleton-row', key: index })),
  );
}

export function ShipmentSkeleton() {
  return createElement('div', { className: 'ui-skeleton-card ui-skeleton-shipment' }, createElement('div', { className: 'ui-skeleton-line ui-skeleton-line-wide' }), createElement('div', { className: 'ui-skeleton-line' }));
}

export function Divider({ className = '' }: { className?: string }) {
  return createElement('div', { className: ['ui-divider', className].filter(Boolean).join(' ') });
}

export function ErrorMessage({ message }: { message: string }) {
  return createElement('div', { className: 'ui-error-message', role: 'alert' }, message);
}

export function ErrorCard({ title = 'Something went wrong', message = 'The request could not be completed.' }: { title?: string; message?: string }) {
  return createElement('section', { className: 'ui-error-card' }, createElement('h2', null, title), createElement('p', null, message));
}

export function NotFoundState({ title = 'Page not found', message = 'The page or record you requested is not available.' }: { title?: string; message?: string }) {
  return createElement('section', { className: 'ui-empty-state' }, createElement('h2', null, title), createElement('p', null, message));
}

export function UnauthorizedState({ title = 'Unauthorized', message = 'You need an account to continue.' }: { title?: string; message?: string }) {
  return createElement('section', { className: 'ui-empty-state' }, createElement('h2', null, title), createElement('p', null, message));
}

export function ServerErrorState({ title = 'Server error', message = 'Please try again in a moment.' }: { title?: string; message?: string }) {
  return createElement('section', { className: 'ui-error-card' }, createElement('h2', null, title), createElement('p', null, message));
}

export function EmptyState({ title = 'No shipments found', description = "You don't have any shipments yet.", action }: { title?: string; description?: string; action?: ReactNode }) {
  return createElement('section', { className: 'ui-empty-state' }, createElement('h2', null, title), createElement('p', null, description), action ?? null);
}

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return createElement('div', { className: ['ui-page-container', className].filter(Boolean).join(' ') }, children);
}

export type ShipmentStatusBadgeProps = { status: string };

const shipmentStatusLabels: Record<string, string> = {
  CREATED: 'Created',
  LABEL_CREATED: 'Label Created',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  ARRIVED_AT_FACILITY: 'Arrived at Facility',
  DEPARTED_FACILITY: 'Departed Facility',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Exception',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

export function ShipmentStatusBadge({ status }: ShipmentStatusBadgeProps) {
  const label = shipmentStatusLabels[status] ?? status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return createElement('span', { className: ['ui-status-badge', `ui-status-${String(status).toLowerCase()}`].join(' ') }, label);
}

export enum ServiceType {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  OVERNIGHT = 'OVERNIGHT',
}

const serviceTypeLabels: Record<string, string> = {
  [ServiceType.STANDARD]: 'Standard',
  [ServiceType.EXPRESS]: 'Express',
  [ServiceType.OVERNIGHT]: 'Overnight',
};

export function ServiceTypeBadge({ type }: { type: string }) {
  const label = serviceTypeLabels[type] ?? type;
  return createElement('span', { className: 'ui-service-type-badge' }, label);
}

export function TrackingNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyTrackingNumber() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return createElement('span', { className: 'ui-tracking-number' },
    createElement('span', { className: 'ui-tracking-number-value' }, value),
    createElement('button', { className: 'ui-tracking-number-copy', type: 'button', onClick: copyTrackingNumber, 'aria-live': 'polite' }, copied ? 'Copied' : 'Copy'),
  );
}

export function Modal({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  if (!open) return null;
  return createElement('div', { className: 'ui-modal-backdrop' },
    createElement('section', { className: 'ui-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      createElement('div', { className: 'ui-modal-head' }, createElement('h3', null, title)),
      createElement('div', { className: 'ui-modal-body' }, children),
    ),
  );
}
