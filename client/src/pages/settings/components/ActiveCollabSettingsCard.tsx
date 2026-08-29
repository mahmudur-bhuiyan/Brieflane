import { useEffect, useState, type SubmitEvent } from 'react';
import { IconLink } from '../../../components/common/icons';
import { useUpdateIntegrationSettingsMutation } from '../../../lib/queries/app-settings';
import { getApiErrorMessage } from '../../../lib/queries/auth';
import { toast } from '../../../lib/toast';
import type { IntegrationSettings } from '../../../types/app-settings';
import {
  isActiveCollabSettingsDirty,
  validateActiveCollabSettings,
} from '../utils/appSettingsForm';
import { IntegrationSettingsCard } from './IntegrationSettingsCard';

export function ActiveCollabSettingsCard({ saved }: { saved: IntegrationSettings }) {
  const updateSettings = useUpdateIntegrationSettingsMutation();
  const [activecollabBaseUrl, setActivecollabBaseUrl] = useState(saved.activecollabBaseUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActivecollabBaseUrl(saved.activecollabBaseUrl);
  }, [saved.activecollabBaseUrl]);

  const submitting = updateSettings.isPending;
  const dirty = isActiveCollabSettingsDirty(activecollabBaseUrl, saved);
  const canSave = dirty && !submitting;
  const configured = Boolean(saved.activecollabBaseUrl.trim());

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setError(null);

    const validation = validateActiveCollabSettings(activecollabBaseUrl);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    try {
      await updateSettings.mutateAsync({
        activecollabBaseUrl: activecollabBaseUrl.trim(),
      });
      toast.success('ActiveCollab settings saved.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save ActiveCollab settings'));
    }
  };

  return (
    <IntegrationSettingsCard
      accent="emerald"
      icon={<IconLink />}
      title="ActiveCollab Service URL"
      description="Configure the ActiveCollab API base URL used for project search and task-hour requests."
      fieldLabel="Service URL"
      fieldValue={activecollabBaseUrl}
      fieldPlaceholder="https://yourcompany.activecollab.com/api/v1"
      fieldRequired
      helperText="Enter the full ActiveCollab API base URL. This endpoint is used when searching projects and loading task hours."
      saveLabel="Save URL"
      savingLabel="Saving…"
      configured={configured}
      configuredSummary="Service Configured"
      configuredDetailLabel="Requests will be sent to:"
      configuredValue={saved.activecollabBaseUrl}
      canSave={canSave}
      submitting={submitting}
      error={error}
      onFieldChange={setActivecollabBaseUrl}
      onSubmit={handleSubmit}
    />
  );
}
