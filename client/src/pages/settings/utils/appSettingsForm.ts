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

type N8nSettingsFormState = {
  n8nReportWebhookUrl: string;
  n8nGmailDraftWebhookUrl: string;
  n8nWebhookSecret: string;
};

function getN8nSettingsChanges(
  form: N8nSettingsFormState,
  saved?: IntegrationSettings | null,
): {
  reportUrlChanged: boolean;
  gmailDraftUrlChanged: boolean;
  secretChanged: boolean;
} {
  if (!saved) {
    return {
      reportUrlChanged: true,
      gmailDraftUrlChanged: true,
      secretChanged: !isN8nWebhookSecretUnchanged(form.n8nWebhookSecret),
    };
  }

  return {
    reportUrlChanged:
      form.n8nReportWebhookUrl.trim() !== (saved.n8nReportWebhookUrl ?? '').trim(),
    gmailDraftUrlChanged:
      form.n8nGmailDraftWebhookUrl.trim() !== (saved.n8nGmailDraftWebhookUrl ?? '').trim(),
    secretChanged: !isN8nWebhookSecretUnchanged(form.n8nWebhookSecret),
  };
}

function validateOptionalUrl(
  value: string,
  label: string,
): { ok: true } | { ok: false; error: string } {
  if (!value) {
    return { ok: true };
  }

  try {
    new URL(value);
  } catch {
    return { ok: false, error: `${label} must be valid` };
  }

  return { ok: true };
}

export function isN8nSettingsDirty(
  form: N8nSettingsFormState,
  saved?: IntegrationSettings | null,
): boolean {
  const { reportUrlChanged, gmailDraftUrlChanged, secretChanged } = getN8nSettingsChanges(
    form,
    saved,
  );

  return reportUrlChanged || gmailDraftUrlChanged || secretChanged;
}

export function validateN8nSettings(
  form: N8nSettingsFormState,
  saved?: IntegrationSettings | null,
): { ok: true } | { ok: false; error: string } {
  const { reportUrlChanged, gmailDraftUrlChanged, secretChanged } = getN8nSettingsChanges(
    form,
    saved,
  );

  if (!reportUrlChanged && !gmailDraftUrlChanged && !secretChanged) {
    return { ok: false, error: 'No n8n settings changes to save' };
  }

  if (reportUrlChanged) {
    const result = validateOptionalUrl(
      form.n8nReportWebhookUrl.trim(),
      'n8n report webhook URL',
    );
    if (!result.ok) {
      return result;
    }
  }

  if (gmailDraftUrlChanged) {
    const result = validateOptionalUrl(
      form.n8nGmailDraftWebhookUrl.trim(),
      'Gmail draft webhook URL',
    );
    if (!result.ok) {
      return result;
    }
  }

  if (secretChanged && !form.n8nWebhookSecret.trim()) {
    return { ok: false, error: 'n8n webhook secret cannot be empty' };
  }

  return { ok: true };
}

export function resolveN8nWebhookSecretForSubmit(secret: string): string | undefined {
  return isN8nWebhookSecretUnchanged(secret) ? undefined : secret;
}

export function buildN8nSettingsUpdatePayload(
  form: N8nSettingsFormState,
  saved?: IntegrationSettings | null,
): {
  n8nReportWebhookUrl?: string;
  n8nGmailDraftWebhookUrl?: string;
  n8nWebhookSecret?: string;
} {
  const { reportUrlChanged, gmailDraftUrlChanged, secretChanged } = getN8nSettingsChanges(
    form,
    saved,
  );
  const payload: {
    n8nReportWebhookUrl?: string;
    n8nGmailDraftWebhookUrl?: string;
    n8nWebhookSecret?: string;
  } = {};

  if (reportUrlChanged) {
    payload.n8nReportWebhookUrl = form.n8nReportWebhookUrl.trim();
  }

  if (gmailDraftUrlChanged) {
    payload.n8nGmailDraftWebhookUrl = form.n8nGmailDraftWebhookUrl.trim();
  }

  if (secretChanged) {
    const secret = resolveN8nWebhookSecretForSubmit(form.n8nWebhookSecret);
    if (secret !== undefined) {
      payload.n8nWebhookSecret = secret;
    }
  }

  return payload;
}

export function createN8nSettingsFormState(saved?: IntegrationSettings | null) {
  return {
    n8nReportWebhookUrl: saved?.n8nReportWebhookUrl ?? '',
    n8nGmailDraftWebhookUrl: saved?.n8nGmailDraftWebhookUrl ?? '',
    n8nWebhookSecret: saved?.n8nWebhookSecretConfigured ? N8N_WEBHOOK_SECRET_MASK : '',
  };
}
