export const APP_SETTING_KEYS = {
  activecollabBaseUrl: 'activecollab_base_url',
  n8nReportWebhookUrl: 'n8n_report_webhook_url',
  n8nWebhookSecret: 'n8n_webhook_secret',
} as const;

export type AppSettingKey = (typeof APP_SETTING_KEYS)[keyof typeof APP_SETTING_KEYS];

export const SENSITIVE_APP_SETTING_KEYS = new Set<AppSettingKey>([
  APP_SETTING_KEYS.n8nWebhookSecret,
]);
