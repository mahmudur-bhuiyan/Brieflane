import { useState, type SubmitEvent } from 'react';
import { IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import type { AuthUser } from '../../../types/auth';
import {
  getApiErrorMessage,
  useChangePasswordMutation,
  useUpdateProfileMutation,
} from '../../../lib/queries/auth';
import { toast } from '../../../lib/toast';

import {
  createProfileFormState,
  isChangingPassword,
  validateProfileForm,
} from '../utils/profileForm';

export function ProfileEditModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const updateProfile = useUpdateProfileMutation();
  const changePassword = useChangePasswordMutation();

  const [form, setForm] = useState(() => createProfileFormState(user));
  const [error, setError] = useState<string | null>(null);

  const submitting = updateProfile.isPending || changePassword.isPending;
  const changingPassword = isChangingPassword(form);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validation = validateProfileForm(form, user);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedDesignation = form.designation.trim();
    const nameChanged = trimmedName !== (user.name ?? '');
    const designationChanged = (trimmedDesignation || null) !== (user.designation ?? null);

    try {
      if (nameChanged || designationChanged) {
        await updateProfile.mutateAsync({
          name: trimmedName,
          designation: trimmedDesignation || null,
        });
      }

      if (changingPassword) {
        await changePassword.mutateAsync({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
      }

      toast.success('Profile updated.');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update profile'));
    }
  };

  return (
    <Modal
      title="Edit profile"
      description="Update your display name, designation, or password. Email cannot be changed."
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Display name"
          icon={<IconUser width={16} height={16} />}
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          autoComplete="name"
          maxLength={120}
          required
        />

        <Input
          label="Designation"
          placeholder="e.g. Project Manager"
          value={form.designation}
          onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))}
          maxLength={120}
        />

        <div className="rounded-xl bg-subtle px-4 py-3 ring-1 ring-(--border)">
          <p className="text-xs font-medium uppercase tracking-wider text-faint">Email</p>
          <p className="mt-1 text-sm text-heading">{user.email}</p>
          <p className="mt-1 text-xs text-muted">Email cannot be changed.</p>
        </div>

        <div className="rounded-xl bg-subtle p-4 ring-1 ring-(--border)">
          <p className="text-sm font-medium text-heading">Change password</p>
          <p className="mt-1 text-xs text-muted">Leave blank to keep your current password.</p>

          <div className="mt-4 space-y-4">
            <Input
              label="Current password"
              type="password"
              value={form.currentPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              autoComplete="current-password"
            />

            <Input
              label="New password"
              type="password"
              value={form.newPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              autoComplete="new-password"
              minLength={8}
            />

            <Input
              label="Confirm new password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
