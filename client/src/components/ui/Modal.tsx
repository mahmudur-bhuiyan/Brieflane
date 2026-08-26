import type { ReactNode } from 'react';
import { IconX } from '../common/icons';
import { Button } from './Button';

export function Modal({
  title,
  description,
  children,
  onClose,
  size = 'md',
  closeAction = 'icon',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl' | '2xl';
  closeAction?: 'icon' | 'button';
}) {
  const sizeClass =
    size === '2xl'
      ? 'max-w-6xl'
      : size === 'xl'
        ? 'max-w-4xl'
        : size === 'lg'
          ? 'max-w-2xl'
          : 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="overlay-backdrop absolute inset-0"
        onClick={onClose}
      />
      <div
        className={`glass-card relative max-h-[min(92dvh,100dvh)] w-full ${sizeClass} overflow-y-auto rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-6`}
      >
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg font-semibold text-heading">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {closeAction === 'button' ? (
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Close
            </Button>
          ) : (
            <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Close">
              <IconX width={16} height={16} />
            </Button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
