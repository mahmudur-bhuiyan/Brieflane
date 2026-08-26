export type TaskHoursReportPeriod = {
  startDate: string;
  endDate: string;
  formatted: string;
};

export type TaskHoursReportProject = {
  id: string;
  name: string;
  clientName?: string | null;
};

export type TaskHoursReportSummary = {
  totalBillableHours: number;
  totalNonBillableHours: number;
  totalLoggedHours: number;
};

export type BillableCategoryBreakdown = {
  category: string;
  hours: number;
};

export type TaskBreakdownRow = {
  userName: string;
  category: string;
  taskId: string;
  taskDescription: string;
  hours: number;
  status: 'Billable' | 'Non-Billable';
};

export type TaskHoursReportSignature = {
  name: string;
  email: string;
};

export type TaskHoursEmailReport = {
  schemaVersion: '1.0';
  generatedAt: string;
  project: TaskHoursReportProject;
  period: TaskHoursReportPeriod;
  summary: TaskHoursReportSummary;
  billableHoursBreakdown: BillableCategoryBreakdown[];
  taskBreakdown: TaskBreakdownRow[];
  signature: TaskHoursReportSignature;
  email: {
    subject: string;
    preheader: string;
    title: string;
    subtitle: string;
  };
};
