import { Modal } from './Modal';
import { Button } from './Button';

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isPending = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} description={description} onClose={onClose}>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? 'Please wait…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
