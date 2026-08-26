import { useEffect, useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconMail, IconShield, IconUser } from '../../components/common/icons';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useActiveCollabCredentialsQuery } from '../../lib/queries/auth';
import { formatRole } from '../../lib/roles';
import { ActiveCollabCredentialsModal } from './components/ActiveCollabCredentialsModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { ProfileField } from './components/ProfileField';

type ProfileModal = 'edit' | 'activecollab' | null;

export function ProfilePage() {
  const { user } = useAuth();
  const { data: acCredentials } = useActiveCollabCredentialsQuery();
  const [openModal, setOpenModal] = useState<ProfileModal>(null);

  useEffect(() => {
    if (!openModal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenModal(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  if (!user) {
    return null;
  }

  return (
    <AppLayout title="Profile" description="View and update your account details.">
      <PageHeader
        title="Profile"
        description="Your account information."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap md:w-auto">
            <Button
              variant="secondary"
              onClick={() => setOpenModal('edit')}
              className="w-full sm:w-auto"
            >
              Edit profile
            </Button>
            <Button
              variant="secondary"
              onClick={() => setOpenModal('activecollab')}
              className="w-full sm:w-auto"
            >
              ActiveCollab credentials
            </Button>
          </div>
        }
      />

      <Card padding={false} className="overflow-hidden">
        <div className="relative h-28 bg-linear-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/12 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-indigo-500/15 sm:h-32">
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
            {acCredentials?.configured && (
              <Badge variant="accent">ActiveCollab configured</Badge>
            )}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
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
          </div>
        </div>
      </Card>

      {openModal === 'edit' && (
        <ProfileEditModal user={user} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'activecollab' && (
        <ActiveCollabCredentialsModal user={user} onClose={() => setOpenModal(null)} />
      )}
    </AppLayout>
  );
}
