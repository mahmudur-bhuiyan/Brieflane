import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 focus-visible:ring-emerald-500/50',
  secondary:
    'border border-(--input-border) bg-subtle text-(--btn-secondary-text) hover:bg-(--hover-bg) focus-visible:ring-emerald-500/20',
  ghost:
    'text-(--btn-ghost-text) hover:bg-(--hover-bg) hover:text-(--btn-ghost-hover-text) focus-visible:ring-emerald-500/20',
  danger:
    'border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 focus-visible:ring-red-500/30 dark:text-red-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
