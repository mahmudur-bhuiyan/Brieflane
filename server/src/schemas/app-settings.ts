import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === '' || z.string().url().safeParse(value).success, {
    message: 'Must be a valid URL',
  });

export const updateIntegrationSettingsSchema = z
  .object({
    activecollabBaseUrl: optionalUrl.optional(),
    n8nReportWebhookUrl: optionalUrl.optional(),
    n8nGmailDraftWebhookUrl: optionalUrl.optional(),
    n8nWebhookSecret: z.string().trim().optional(),
  })
  .refine(
    (value) =>
      value.activecollabBaseUrl !== undefined ||
      value.n8nReportWebhookUrl !== undefined ||
      value.n8nGmailDraftWebhookUrl !== undefined ||
      value.n8nWebhookSecret !== undefined,
    { message: 'At least one setting must be provided' },
  );
