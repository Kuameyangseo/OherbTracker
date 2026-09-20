import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Label({ children, htmlFor, className = '' }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return <label className={`form-label ${className}`.trim()} htmlFor={htmlFor}>{children}</label>;
}

export function Input({ error = false, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input {...props} className={`form-input ${error ? 'form-input-error' : ''}`.trim()} />;
}

export function Textarea({ error = false, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return <textarea {...props} className={`form-textarea ${error ? 'form-input-error' : ''}`.trim()} />;
}

export function Select({ error = false, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean; children: ReactNode }) {
  return <select {...props} className={`form-input ${error ? 'form-input-error' : ''}`.trim()}>{children}</select>;
}

export function Button({ children, loading = false, disabled, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; children: ReactNode }) {
  return (
    <button {...props} type={type} disabled={disabled || loading} className={`form-button ${className}`.trim()}>
      {loading ? 'Checking shipment...' : children}
    </button>
  );
}

export function Alert({ tone = 'info', children }: { tone?: 'info' | 'success' | 'warn' | 'danger'; children: ReactNode }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}
