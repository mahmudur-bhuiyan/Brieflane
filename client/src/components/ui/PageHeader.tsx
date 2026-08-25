import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-heading sm:text-2xl xl:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && (
        <div className="w-full shrink-0 md:w-auto md:max-w-sm lg:max-w-none">{action}</div>
      )}
    </div>
  );
}
