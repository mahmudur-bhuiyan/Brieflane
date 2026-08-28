import { AppLayout } from '../../components/layout/AppLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { useIntegrationSettingsQuery } from '../../lib/queries/app-settings';
import { ActiveCollabSettingsCard } from './components/ActiveCollabSettingsCard';
import { N8nSettingsCard } from './components/N8nSettingsCard';

export function SettingsPage() {
  const settingsQuery = useIntegrationSettingsQuery();

  return (
    <AppLayout
      title="Settings"
      description="Manage system-wide integration configuration."
    >
      <PageHeader
        title="Settings"
        description="Super admin configuration for external integrations."
      />

      {settingsQuery.isPending && <p className="text-sm text-muted">Loading settings…</p>}

      {settingsQuery.isError && (
        <p className="text-sm text-red-500" role="alert">
          Failed to load settings.
        </p>
      )}

      {settingsQuery.data && (
        <div className="space-y-6">
          <ActiveCollabSettingsCard saved={settingsQuery.data} />
          <N8nSettingsCard saved={settingsQuery.data} />
        </div>
      )}
    </AppLayout>
  );
}
