import { z } from 'zod';

export const draftGmailReportSchema = z.object({
  emailTemplate: z.string().min(1, 'Email template is required'),
  json: z.object({}).passthrough(),
});

export type DraftGmailReportInput = z.infer<typeof draftGmailReportSchema>;
