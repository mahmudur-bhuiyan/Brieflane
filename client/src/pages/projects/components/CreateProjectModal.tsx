import { useState, type FormEvent } from 'react';
import { IconFolder, IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import {
  getApiErrorMessage,
  useCreateProjectMutation,
} from '../../../lib/queries/projects';
import {
  emptyCreateProjectForm,
  type CreateProjectFormState,
} from '../types/createProjectForm';
import { buildCreateProjectPayload } from '../utils/createProjectForm';

export function CreateProjectModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const createProject = useCreateProjectMutation();
  const [form, setForm] = useState<CreateProjectFormState>(emptyCreateProjectForm);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = buildCreateProjectPayload(form);
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    try {
      await createProject.mutateAsync(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create project'));
    }
  }

  return (
    <Modal
      title="Add project"
      description="Create a project manually when you already know the ActiveCollab id."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="ActiveCollab project id"
          type="number"
          required
          min={1}
          value={form.acProjectId}
          onChange={(e) => setForm((prev) => ({ ...prev, acProjectId: e.target.value }))}
        />
        <Input
          label="Project name"
          required
          icon={<IconFolder width={16} height={16} />}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <Input
          label="Client name"
          icon={<IconUser width={16} height={16} />}
          value={form.clientName}
          onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
        />
        <Input
          label="Client email"
          type="email"
          value={form.clientEmail}
          onChange={(e) => setForm((prev) => ({ ...prev, clientEmail: e.target.value }))}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={createProject.isPending} className="w-full sm:w-auto">
            {createProject.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
