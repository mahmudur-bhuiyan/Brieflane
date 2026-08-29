import type { IntegrationSettings } from '../../../types/app-settings';

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
  n8nGmailDraftWebhookUrl: string;
};

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
  if (!saved) {
    return true;
  }

  return form.n8nGmailDraftWebhookUrl.trim() !== (saved.n8nGmailDraftWebhookUrl ?? '').trim();
}

export function validateN8nSettings(
  form: N8nSettingsFormState,
  saved?: IntegrationSettings | null,
): { ok: true } | { ok: false; error: string } {
  if (!isN8nSettingsDirty(form, saved)) {
    return { ok: false, error: 'No n8n settings changes to save' };
  }

  return validateOptionalUrl(form.n8nGmailDraftWebhookUrl.trim(), 'Gmail draft webhook URL');
}

export function buildN8nSettingsUpdatePayload(
  form: N8nSettingsFormState,
  saved?: IntegrationSettings | null,
): { n8nGmailDraftWebhookUrl?: string } {
  if (!isN8nSettingsDirty(form, saved)) {
    return {};
  }

  return { n8nGmailDraftWebhookUrl: form.n8nGmailDraftWebhookUrl.trim() };
}

export function createN8nSettingsFormState(saved?: IntegrationSettings | null) {
  return {
    n8nGmailDraftWebhookUrl: saved?.n8nGmailDraftWebhookUrl ?? '',
  };
}
