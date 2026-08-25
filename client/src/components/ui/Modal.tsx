import type { ReactNode } from 'react';
import { IconX } from '../icons';
import { Button } from './Button';

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="overlay-backdrop absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-card relative max-h-[min(92dvh,100dvh)] w-full max-w-md overflow-y-auto rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg font-semibold text-heading">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Close">
            <IconX width={16} height={16} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
