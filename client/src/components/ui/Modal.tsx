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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in glass-card rounded-2xl p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
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
