export type IntegrationSettings = {
  activecollabBaseUrl: string;
  n8nReportWebhookUrl: string;
  n8nGmailDraftWebhookUrl: string;
  n8nWebhookSecretConfigured: boolean;
};

export type UpdateIntegrationSettingsInput = {
  activecollabBaseUrl?: string;
  n8nReportWebhookUrl?: string;
  n8nGmailDraftWebhookUrl?: string;
  n8nWebhookSecret?: string;
};
