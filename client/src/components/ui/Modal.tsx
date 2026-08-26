import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '../common/icons';
import { Button } from './Button';

export function Modal({
  title,
  description,
  children,
  onClose,
  size = 'md',
  closeAction = 'icon',
  bodyClassName = 'min-h-0 flex-1 overflow-y-auto',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeAction?: 'icon' | 'button';
  bodyClassName?: string;
}) {
  const sizeClass =
    size === 'full'
      ? 'max-w-[min(96vw,72rem)]'
      : size === '2xl'
        ? 'max-w-6xl'
        : size === 'xl'
          ? 'max-w-4xl'
          : size === 'lg'
            ? 'max-w-2xl'
            : 'max-w-md';

  const heightClass =
    size === 'full' ? 'h-[min(92dvh,100dvh)]' : 'max-h-[min(92dvh,100dvh)]';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="overlay-backdrop absolute inset-0"
        onClick={onClose}
      />
      <div
        className={`glass-card relative flex w-full flex-col overflow-hidden ${heightClass} ${sizeClass} rounded-t-2xl p-5 shadow-2xl sm:rounded-2xl sm:p-6`}
      >
        <div className="mb-5 flex shrink-0 items-start justify-between gap-4 sm:mb-6">
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
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
