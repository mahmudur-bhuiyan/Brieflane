import type { IntegrationSettings } from '../../../types/app-settings';

export const N8N_WEBHOOK_SECRET_MASK = '**********';

export function isN8nWebhookSecretUnchanged(secret: string): boolean {
  return secret === '' || secret === N8N_WEBHOOK_SECRET_MASK;
}

export function isActiveCollabSettingsDirty(
  activecollabBaseUrl: string,
  saved?: IntegrationSettings | null,
): boolean {
  if (!saved) {
    return true;
  }

  return activecollabBaseUrl.trim() !== (saved.activecollabBaseUrl ?? '').trim();
}

export function validateActiveCollabSettings(
  activecollabBaseUrl: string,
): { ok: true } | { ok: false; error: string } {
  const value = activecollabBaseUrl.trim();

  if (!value) {
    return { ok: false, error: 'ActiveCollab base URL is required' };
  }

  try {
    new URL(value);
  } catch {
    return { ok: false, error: 'ActiveCollab base URL must be valid' };
  }

  return { ok: true };
}

export function isN8nSettingsDirty(
  form: {
    n8nReportWebhookUrl: string;
    n8nGmailDraftWebhookUrl: string;
    n8nWebhookSecret: string;
  },
  saved?: IntegrationSettings | null,
): boolean {
  if (!saved) {
    return true;
  }

  const urlChanged =
    form.n8nReportWebhookUrl.trim() !== (saved.n8nReportWebhookUrl ?? '').trim();
  const gmailDraftUrlChanged =
    form.n8nGmailDraftWebhookUrl.trim() !== (saved.n8nGmailDraftWebhookUrl ?? '').trim();
  const secretChanged = !isN8nWebhookSecretUnchanged(form.n8nWebhookSecret);

  return urlChanged || gmailDraftUrlChanged || secretChanged;
}

export function validateN8nSettings(
  form: {
    n8nReportWebhookUrl: string;
    n8nGmailDraftWebhookUrl: string;
    n8nWebhookSecret: string;
  },
  secretConfigured: boolean,
): { ok: true } | { ok: false; error: string } {
  const n8nReportWebhookUrl = form.n8nReportWebhookUrl.trim();
  const n8nGmailDraftWebhookUrl = form.n8nGmailDraftWebhookUrl.trim();

  if (!n8nReportWebhookUrl) {
    return { ok: false, error: 'n8n report webhook URL is required' };
  }

  try {
    new URL(n8nReportWebhookUrl);
  } catch {
    return { ok: false, error: 'n8n report webhook URL must be valid' };
  }

  if (n8nGmailDraftWebhookUrl) {
    try {
      new URL(n8nGmailDraftWebhookUrl);
    } catch {
      return { ok: false, error: 'Gmail draft webhook URL must be valid' };
    }
  }

  if (!secretConfigured && isN8nWebhookSecretUnchanged(form.n8nWebhookSecret)) {
    return { ok: false, error: 'n8n webhook secret is required' };
  }

  return { ok: true };
}

export function resolveN8nWebhookSecretForSubmit(secret: string): string | undefined {
  return isN8nWebhookSecretUnchanged(secret) ? undefined : secret;
}

export function createN8nSettingsFormState(saved?: IntegrationSettings | null) {
  return {
    n8nReportWebhookUrl: saved?.n8nReportWebhookUrl ?? '',
    n8nGmailDraftWebhookUrl: saved?.n8nGmailDraftWebhookUrl ?? '',
    n8nWebhookSecret: saved?.n8nWebhookSecretConfigured ? N8N_WEBHOOK_SECRET_MASK : '',
  };
}
