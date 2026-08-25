import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

export function Input({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input className={`input-field ${className}`} {...props} />
    </label>
  );
}

export function Select({
  label,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted">{label}</span>
      <select className={`input-field ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
