import { z } from 'zod';

const customHoursEntrySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['pm', 'custom']),
  userName: z.string().min(1),
  jobType: z.string(),
  description: z.string(),
  hours: z.number().positive(),
});

const taskHoursEmailReportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  generatedAt: z.string().min(1),
  project: z.object({
    id: z.string(),
    name: z.string(),
    clientName: z.string().nullable().optional(),
  }),
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
    formatted: z.string(),
  }),
  summary: z.object({
    totalBillableHours: z.number(),
    totalNonBillableHours: z.number(),
    totalLoggedHours: z.number(),
  }),
  billableHoursBreakdown: z.array(
    z.object({
      category: z.string(),
      hours: z.number(),
    }),
  ),
  taskBreakdown: z.array(
    z.object({
      userName: z.string(),
      category: z.string(),
      taskId: z.string(),
      taskDescription: z.string(),
      hours: z.number(),
      status: z.enum(['Billable', 'Non-Billable']),
    }),
  ),
  signature: z.object({
    name: z.string(),
    email: z.string(),
    designation: z.string().nullable().optional(),
  }),
  email: z.object({
    subject: z.string(),
    preheader: z.string(),
    title: z.string(),
    subtitle: z.string(),
  }),
});

export const draftGmailReportSchema = z.object({
  email: z.object({
    template: z.string().min(1, 'Email template is required'),
    subject: z.string().min(1, 'Email subject is required'),
  }),
  formattedData: z.object({
    report: taskHoursEmailReportSchema,
    customHours: z.array(customHoursEntrySchema),
  }),
});

export type DraftGmailReportInput = z.infer<typeof draftGmailReportSchema>;

export type GmailDraftN8nPayload = {
  email: {
    toEmail: string;
    subject: string;
    template: string;
  };
  formattedData: DraftGmailReportInput['formattedData'];
};
