import { useEffect, useState, type SubmitEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { useUpdateIntegrationSettingsMutation } from '../../../lib/queries/app-settings';
import { getApiErrorMessage } from '../../../lib/queries/auth';
import { toast } from '../../../lib/toast';
import type { IntegrationSettings } from '../../../types/app-settings';
import {
  isActiveCollabSettingsDirty,
  validateActiveCollabSettings,
} from '../utils/appSettingsForm';

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
    <Card>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-base font-semibold text-heading">ActiveCollab</h3>
          <p className="mt-1 text-sm text-muted">
            Base URL for project sync, search, and task-hour requests.
          </p>
        </div>

        <Input
          label="Base URL"
          type="url"
          required
          placeholder="https://yourcompany.activecollab.com/api/v1"
          value={activecollabBaseUrl}
          onChange={(event) => setActivecollabBaseUrl(event.target.value)}
        />

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSave}>
            {submitting ? 'Saving…' : 'Save ActiveCollab'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
