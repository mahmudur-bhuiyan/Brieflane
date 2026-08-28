import { decryptSecret, encryptSecret } from './credentials-crypto.js';
import { prisma } from './prisma.js';
import { APP_SETTING_KEYS, SENSITIVE_APP_SETTING_KEYS, type AppSettingKey } from './app-settings/keys.js';

const cache = new Map<AppSettingKey, string>();

function clearCache(): void {
  cache.clear();
}

async function readSetting(key: AppSettingKey): Promise<string | null> {
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached || null;
  }

  const row = await prisma.appSetting.findUnique({
    where: { key },
    select: { value: true },
  });

  if (!row?.value) {
    cache.set(key, '');
    return null;
  }

  let value: string;

  try {
    value = SENSITIVE_APP_SETTING_KEYS.has(key) ? decryptSecret(row.value) : row.value;
  } catch {
    if (SENSITIVE_APP_SETTING_KEYS.has(key)) {
      cache.set(key, '');
      return null;
    }

    throw new Error(`Failed to read app setting "${key}"`);
  }

  cache.set(key, value);
  return value;
}

async function writeSetting(key: AppSettingKey, value: string, updatedBy?: string): Promise<void> {
  const storedValue = SENSITIVE_APP_SETTING_KEYS.has(key) ? encryptSecret(value) : value;

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: storedValue, updatedBy },
    update: { value: storedValue, updatedBy },
  });

  cache.set(key, value);
}

export type IntegrationSettingsResponse = {
  activecollabBaseUrl: string;
  n8nReportWebhookUrl: string;
  n8nWebhookSecretConfigured: boolean;
};

export async function getIntegrationSettings(): Promise<IntegrationSettingsResponse> {
  const [activecollabBaseUrl, n8nReportWebhookUrl, n8nWebhookSecret] = await Promise.all([
    readSetting(APP_SETTING_KEYS.activecollabBaseUrl),
    readSetting(APP_SETTING_KEYS.n8nReportWebhookUrl),
    readSetting(APP_SETTING_KEYS.n8nWebhookSecret),
  ]);

  return {
    activecollabBaseUrl: activecollabBaseUrl ?? '',
    n8nReportWebhookUrl: n8nReportWebhookUrl ?? '',
    n8nWebhookSecretConfigured: Boolean(n8nWebhookSecret),
  };
}

export async function updateIntegrationSettings(
  input: {
    activecollabBaseUrl?: string;
    n8nReportWebhookUrl?: string;
    n8nWebhookSecret?: string;
  },
  updatedBy: string,
): Promise<IntegrationSettingsResponse> {
  if (input.activecollabBaseUrl !== undefined) {
    await writeSetting(APP_SETTING_KEYS.activecollabBaseUrl, input.activecollabBaseUrl, updatedBy);
  }

  if (input.n8nReportWebhookUrl !== undefined) {
    await writeSetting(APP_SETTING_KEYS.n8nReportWebhookUrl, input.n8nReportWebhookUrl, updatedBy);
  }

  if (input.n8nWebhookSecret) {
    await writeSetting(APP_SETTING_KEYS.n8nWebhookSecret, input.n8nWebhookSecret, updatedBy);
  }

  return getIntegrationSettings();
}

export async function getActiveCollabBaseUrl(): Promise<string | null> {
  const value = await readSetting(APP_SETTING_KEYS.activecollabBaseUrl);
  return value?.trim() || null;
}

export async function getN8nConfig(): Promise<{ webhookUrl: string; webhookSecret: string } | null> {
  const [webhookUrl, webhookSecret] = await Promise.all([
    readSetting(APP_SETTING_KEYS.n8nReportWebhookUrl),
    readSetting(APP_SETTING_KEYS.n8nWebhookSecret),
  ]);

  if (!webhookUrl?.trim() || !webhookSecret?.trim()) {
    return null;
  }

  return {
    webhookUrl: webhookUrl.trim(),
    webhookSecret: webhookSecret.trim(),
  };
}

export function resetAppSettingsCacheForTests(): void {
  clearCache();
}
