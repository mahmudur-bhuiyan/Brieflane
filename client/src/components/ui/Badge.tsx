import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'neutral' | 'warning' | 'accent';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300',
  neutral: 'bg-(--badge-neutral-bg) text-(--badge-neutral-text) ring-(--badge-neutral-ring)',
  warning: 'bg-amber-500/15 text-amber-600 ring-amber-500/25 dark:text-amber-300',
  accent: 'bg-indigo-500/15 text-indigo-600 ring-indigo-500/25 dark:text-indigo-300',
};

export function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
