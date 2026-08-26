import { useState, type FormEvent } from 'react';
import { IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input, Select } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import type { CustomHoursEntry, CustomHoursFormState } from '../types/customHours';
import {
  buildCustomHoursEntry,
  createEmptyCustomHoursForm,
  getCustomHoursTypeLabel,
  validateCustomHoursForm,
} from '../utils/customHours';

export function AddCustomHoursModal({
  defaultUserName,
  onClose,
  onAdd,
}: {
  defaultUserName?: string;
  onClose: () => void;
  onAdd: (entry: CustomHoursEntry) => void;
}) {
  const [form, setForm] = useState<CustomHoursFormState>(() =>
    createEmptyCustomHoursForm(defaultUserName ?? ''),
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateCustomHoursForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry = buildCustomHoursEntry(form);
    if (!entry) {
      setError('Could not add hours. Check the form and try again.');
      return;
    }

    onAdd(entry);
    onClose();
  }

  const isCustom = form.type === 'custom';

  return (
    <Modal
      title="Add hours"
      description="Add PM or custom billable hours to this report. They appear in the table and summary totals."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Select
          label="Hours type"
          value={form.type}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              type: event.target.value as CustomHoursFormState['type'],
            }))
          }
        >
          <option value="pm">{getCustomHoursTypeLabel('pm')}</option>
          <option value="custom">{getCustomHoursTypeLabel('custom')}</option>
        </Select>

        <Input
          label="User name"
          type="text"
          required
          icon={<IconUser width={16} height={16} />}
          value={form.userName}
          onChange={(event) => setForm((prev) => ({ ...prev, userName: event.target.value }))}
        />

        {isCustom ? (
          <>
            <Input
              label="Job type"
              type="text"
              required
              placeholder="e.g. Backend Development"
              value={form.jobType}
              onChange={(event) => setForm((prev) => ({ ...prev, jobType: event.target.value }))}
            />
            <Input
              label="Task description"
              type="text"
              required
              placeholder="Describe the work"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </>
        ) : (
          <p className="rounded-xl border border-subtle bg-subtle px-3 py-2.5 text-sm text-muted">
            PM hours are recorded as{' '}
            <span className="font-medium text-heading">Project Management</span> with description{' '}
            <span className="font-medium text-heading">PM hours</span>.
          </p>
        )}

        <Input
          label="Hours"
          type="number"
          required
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={form.hours}
          onChange={(event) => setForm((prev) => ({ ...prev, hours: event.target.value }))}
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add hours</Button>
        </div>
      </form>
    </Modal>
  );
}
