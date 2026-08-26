import type { ReactNode } from 'react';

export function ProfileField({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-(--border-strong) bg-subtle p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-strong) bg-(--card-bg) text-emerald-600 dark:text-emerald-500">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-heading">{value}</p>
          {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
