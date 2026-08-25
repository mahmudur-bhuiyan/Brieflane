import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-500/20';

export function Input({
  label,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <input className={`${fieldClass} ${className}`} {...props} />
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
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <select className={`${fieldClass} ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
