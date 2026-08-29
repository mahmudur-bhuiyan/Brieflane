import { useEffect, useState, type SubmitEvent } from 'react';
import { IconMail } from '../../../components/common/icons';
import { useUpdateIntegrationSettingsMutation } from '../../../lib/queries/app-settings';
import { getApiErrorMessage } from '../../../lib/queries/auth';
import { toast } from '../../../lib/toast';
import type { IntegrationSettings } from '../../../types/app-settings';
import {
  buildN8nSettingsUpdatePayload,
  createN8nSettingsFormState,
  isN8nSettingsDirty,
  validateN8nSettings,
} from '../utils/appSettingsForm';
import { IntegrationSettingsCard } from './IntegrationSettingsCard';

export function N8nSettingsCard({ saved }: { saved: IntegrationSettings }) {
  const updateSettings = useUpdateIntegrationSettingsMutation();
  const [form, setForm] = useState(() => createN8nSettingsFormState(saved));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(createN8nSettingsFormState(saved));
  }, [saved]);

  const submitting = updateSettings.isPending;
  const dirty = isN8nSettingsDirty(form, saved);
  const canSave = dirty && !submitting;
  const configured = Boolean(saved.n8nGmailDraftWebhookUrl.trim());

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setError(null);

    const validation = validateN8nSettings(form, saved);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const payload = buildN8nSettingsUpdatePayload(form, saved);
    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      await updateSettings.mutateAsync(payload);
      toast.success('n8n settings saved.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save n8n settings'));
    }
  };

  return (
    <IntegrationSettingsCard
      accent="violet"
      icon={<IconMail />}
      title="n8n Gmail Draft Webhook"
      description="Configure the n8n webhook URL used when drafting task-hours reports in Gmail from the generate report page."
      fieldLabel="Webhook URL"
      fieldValue={form.n8nGmailDraftWebhookUrl}
      fieldPlaceholder="https://n8n.example.com/webhook/gmail-draft"
      helperText="Enter the full webhook URL where Gmail draft requests should be sent. Clear and save to remove the URL."
      saveLabel="Save URL"
      savingLabel="Saving…"
      configured={configured}
      configuredSummary="Service Configured"
      configuredDetailLabel="Gmail drafts will be sent to:"
      configuredValue={saved.n8nGmailDraftWebhookUrl}
      canSave={canSave}
      submitting={submitting}
      error={error}
      onFieldChange={(value) => setForm((prev) => ({ ...prev, n8nGmailDraftWebhookUrl: value }))}
      onSubmit={handleSubmit}
    />
  );
}
