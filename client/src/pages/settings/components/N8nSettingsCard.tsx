import { useEffect, useState, type SubmitEvent } from 'react';
import { IconLock } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { useUpdateIntegrationSettingsMutation } from '../../../lib/queries/app-settings';
import { getApiErrorMessage } from '../../../lib/queries/auth';
import { toast } from '../../../lib/toast';
import type { IntegrationSettings } from '../../../types/app-settings';
import {
  createN8nSettingsFormState,
  isN8nSettingsDirty,
  N8N_WEBHOOK_SECRET_MASK,
  resolveN8nWebhookSecretForSubmit,
  validateN8nSettings,
} from '../utils/appSettingsForm';

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

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setError(null);

    const validation = validateN8nSettings(form, saved.n8nWebhookSecretConfigured);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    try {
      await updateSettings.mutateAsync({
        n8nReportWebhookUrl: form.n8nReportWebhookUrl.trim(),
        n8nGmailDraftWebhookUrl: form.n8nGmailDraftWebhookUrl.trim(),
        n8nWebhookSecret: resolveN8nWebhookSecretForSubmit(form.n8nWebhookSecret),
      });
      toast.success('n8n settings saved.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save n8n settings'));
    }
  };

  return (
    <Card>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <h3 className="text-base font-semibold text-heading">n8n</h3>
          <p className="mt-1 text-sm text-muted">
            Webhook URLs and shared secret used for report generation and Gmail drafts.
          </p>
        </div>

        <Input
          label="Report webhook URL"
          type="url"
          required
          placeholder="https://n8n.example.com/webhook/generate-report"
          value={form.n8nReportWebhookUrl}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, n8nReportWebhookUrl: event.target.value }))
          }
        />

        <Input
          label="Gmail draft webhook URL"
          type="url"
          placeholder="https://n8n.example.com/webhook/gmail-draft"
          value={form.n8nGmailDraftWebhookUrl}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, n8nGmailDraftWebhookUrl: event.target.value }))
          }
        />
        <p className="-mt-3 text-xs text-muted">
          Used when drafting task-hours reports in Gmail from the generate report page.
        </p>

        <div>
          <Input
            label="Webhook secret"
            type="password"
            required={!saved.n8nWebhookSecretConfigured}
            icon={<IconLock width={16} height={16} />}
            value={form.n8nWebhookSecret}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, n8nWebhookSecret: event.target.value }))
            }
            onFocus={() => {
              if (form.n8nWebhookSecret === N8N_WEBHOOK_SECRET_MASK) {
                setForm((prev) => ({ ...prev, n8nWebhookSecret: '' }));
              }
            }}
          />
          <p className="mt-1.5 text-xs text-muted">
            {saved.n8nWebhookSecretConfigured
              ? 'Replace the masked secret only if you want to change it.'
              : 'Enter the shared secret sent as X-Brieflane-Secret.'}
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSave}>
            {submitting ? 'Saving…' : 'Save n8n'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
