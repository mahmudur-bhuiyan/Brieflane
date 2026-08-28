import { z } from 'zod';

export const draftGmailReportSchema = z.object({
  email: z.object({
    template: z.string().min(1, 'Email template is required'),
    subject: z.string().min(1, 'Email subject is required'),
  }),
  formattedData: z.object({}).passthrough(),
});

export type DraftGmailReportInput = z.infer<typeof draftGmailReportSchema>;
