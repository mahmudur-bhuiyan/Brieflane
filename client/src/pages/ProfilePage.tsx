import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AppLayout } from '../components/AppLayout';
import { IconMail, IconShield, IconUser } from '../components/icons';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../types/auth';
import {
  getApiErrorMessage,
  useChangePasswordMutation,
  useUpdateProfileMutation,
} from '../lib/queries/auth';
import { formatRole } from '../lib/roles';

type ProfileFormState = {
  name: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function ProfileField({
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

function ProfileEditModal({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  const updateProfile = useUpdateProfileMutation();
  const changePassword = useChangePasswordMutation();

  const [form, setForm] = useState<ProfileFormState>({
    name: user.name ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);

  const submitting = updateProfile.isPending || changePassword.isPending;
  const changingPassword =
    Boolean(form.currentPassword) || Boolean(form.newPassword) || Boolean(form.confirmPassword);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    const nameChanged = trimmedName !== (user.name ?? '');

    if (changingPassword) {
      if (!form.currentPassword) {
        setError('Enter your current password to set a new one');
        return;
      }

      if (form.newPassword.length < 8) {
        setError('New password must be at least 8 characters');
        return;
      }

      if (form.newPassword !== form.confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    if (!nameChanged && !changingPassword) {
      setError('No changes to save');
      return;
    }

    try {
      if (nameChanged) {
        await updateProfile.mutateAsync({ name: trimmedName });
      }

      if (changingPassword) {
        await changePassword.mutateAsync({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
      }

      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update profile'));
    }
  };

  return (
    <Modal
      title="Edit profile"
      description="Update your display name or password. Email cannot be changed."
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

export function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEditing(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing]);

  if (!user) {
    return null;
  }

  return (
    <AppLayout title="Profile" description="View and update your account details.">
      <PageHeader
        title="Profile"
        description="Your account information and access level."
        action={
          <Button variant="secondary" onClick={() => setEditing(true)} className="w-full sm:w-auto">
            Edit profile
          </Button>
        }
      />

      <Card padding={false} className="overflow-hidden">
        <div className="relative h-28 bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/12 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-indigo-500/15 sm:h-32">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-600/15 blur-3xl dark:bg-emerald-500/20" />
          <div className="absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-indigo-600/12 blur-3xl dark:bg-indigo-500/15" />

          <div className="absolute inset-x-0 bottom-0 px-4 pb-3 sm:px-6 sm:pb-4 lg:px-8">
            <div className="ml-24 min-w-0">
              <h2 className="truncate text-xl font-semibold text-heading sm:text-2xl">
                {user.name || 'No name set'}
              </h2>
              <p className="mt-0.5 truncate text-sm text-body">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="relative px-4 pb-5 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
          <Avatar
            name={user.name}
            email={user.email}
            size="lg"
            className="absolute left-4 top-0 z-10 -translate-y-1/2 sm:left-6 lg:left-8"
          />

          <div className="ml-24 flex flex-wrap items-center gap-2 pt-11 sm:pt-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-(--border-strong) bg-subtle px-3 py-1.5 text-xs font-medium text-body">
              <IconShield width={14} height={14} className="text-emerald-600 dark:text-emerald-500" />
              <span>{formatRole(user.role)}</span>
            </span>
            <Badge variant="success">Active session</Badge>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <ProfileField
              icon={<IconUser width={16} height={16} />}
              label="Display name"
              value={user.name || 'No name set'}
            />
            <ProfileField
              icon={<IconMail width={16} height={16} />}
              label="Email address"
              value={user.email}
              hint="Cannot be changed"
            />
            <ProfileField
              icon={<IconShield width={16} height={16} />}
              label="Access level"
              value={formatRole(user.role)}
              hint="Managed by administrators"
            />
          </div>
        </div>
      </Card>

      {editing && <ProfileEditModal user={user} onClose={() => setEditing(false)} />}
    </AppLayout>
  );
}
