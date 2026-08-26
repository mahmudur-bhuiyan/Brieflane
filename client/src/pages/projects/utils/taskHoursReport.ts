import type {
  BillableCategoryBreakdown,
  TaskBreakdownRow,
  TaskHoursEmailReport,
  TaskHoursReportSignature,
} from '../types/taskHoursReport';
import type { CustomHoursEntry } from '../types/customHours';
import {
  getCustomHoursTotal,
  splitCustomHours,
} from './customHours';
import {
  parseTaskHoursSummary,
  parseTaskHoursTable,
  type TaskHoursTableRow,
} from './taskHoursTable';

const CATEGORY_ORDER = ['Development', 'QA', 'Server', 'PM', 'Other'] as const;

const JOB_TYPE_CATEGORY_MAP: Record<string, string> = {
  'backend development': 'Development',
  'frontend development': 'Development',
  'manual testing': 'QA',
  'server client': 'Server',
  'project management': 'PM',
};

function parseHoursNumber(value: string | undefined): number {
  if (!value || value === '—') {
    return 0;
  }

  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

export function mapJobTypeToReportCategory(jobType: string): string {
  const normalized = jobType.trim().toLowerCase();

  if (JOB_TYPE_CATEGORY_MAP[normalized]) {
    return JOB_TYPE_CATEGORY_MAP[normalized];
  }

  if (normalized.includes('development')) {
    return 'Development';
  }

  if (normalized.includes('test') || normalized.includes('qa')) {
    return 'QA';
  }

  if (normalized.includes('server')) {
    return 'Server';
  }

  if (normalized.includes('pm') || normalized.includes('project management')) {
    return 'PM';
  }

  return 'Other';
}

function formatBreakdownCategory(jobType: string): string {
  const mapped = mapJobTypeToReportCategory(jobType);
  const normalized = jobType.trim().toLowerCase();

  if (mapped === 'Development' && normalized.includes('development')) {
    return 'Development';
  }

  if (mapped === 'QA' && normalized !== 'qa') {
    return 'QA';
  }

  return jobType;
}

function sortCategories(categories: BillableCategoryBreakdown[]): BillableCategoryBreakdown[] {
  return [...categories].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.category as (typeof CATEGORY_ORDER)[number]);
    const bIndex = CATEGORY_ORDER.indexOf(b.category as (typeof CATEGORY_ORDER)[number]);
    const safeA = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
    const safeB = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;

    if (safeA !== safeB) {
      return safeA - safeB;
    }

    return a.category.localeCompare(b.category);
  });
}

function buildBillableBreakdown(rows: TaskBreakdownRow[]): BillableCategoryBreakdown[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    if (row.status !== 'Billable') {
      continue;
    }

    const category = mapJobTypeToReportCategory(row.category);
    totals.set(category, roundHours((totals.get(category) ?? 0) + row.hours));
  }

  return sortCategories(
    [...totals.entries()].map(([category, hours]) => ({
      category,
      hours,
    })),
  );
}

function addPmHoursToBreakdown(
  breakdown: BillableCategoryBreakdown[],
  pmHours: CustomHoursEntry[],
): BillableCategoryBreakdown[] {
  const pmTotal = roundHours(pmHours.reduce((sum, entry) => sum + entry.hours, 0));
  if (pmTotal <= 0) {
    return breakdown;
  }

  const totals = new Map(breakdown.map((row) => [row.category, row.hours]));
  totals.set('PM', roundHours((totals.get('PM') ?? 0) + pmTotal));

  return sortCategories(
    [...totals.entries()].map(([category, hours]) => ({
      category,
      hours,
    })),
  );
}

function tableRowToTaskBreakdownRow(row: TaskHoursTableRow): TaskBreakdownRow {
  const rawJobType = row.values.job_type ?? '—';

  return {
    userName: row.values.user_name ?? '—',
    category: rawJobType === '—' ? '—' : formatBreakdownCategory(rawJobType),
    taskId: row.values.task_id ?? '—',
    taskDescription: row.values.task_name ?? row.values.task ?? '—',
    hours: roundHours(parseHoursNumber(row.values.hours)),
    status: row.values.status === 'Non-Billable' ? 'Non-Billable' : 'Billable',
  };
}

function customHoursEntryToTaskBreakdownRow(entry: CustomHoursEntry): TaskBreakdownRow {
  return {
    userName: entry.userName,
    category: formatBreakdownCategory(entry.jobType),
    taskId: '—',
    taskDescription: entry.description,
    hours: roundHours(entry.hours),
    status: 'Billable',
  };
}

function formatPeriod(startDate: string, endDate: string): string {
  if (startDate === '—' && endDate === '—') {
    return '—';
  }

  return `${startDate} – ${endDate}`;
}

export function buildTaskHoursEmailReport(
  data: unknown,
  signature: TaskHoursReportSignature,
  projectMeta?: { clientName?: string | null },
  customHours: CustomHoursEntry[] = [],
): TaskHoursEmailReport | null {
  const summary = parseTaskHoursSummary(data);
  const parsedTable = parseTaskHoursTable(data);

  if (!summary || parsedTable.rows.length === 0) {
    return null;
  }

  const { pmHours, customTaskHours } = splitCustomHours(customHours);
  const additionalBillableHours = getCustomHoursTotal(customHours);

  const fetchedTaskRows = parsedTable.rows.map(tableRowToTaskBreakdownRow);
  const fetchedBillableRows = fetchedTaskRows.filter((row) => row.status === 'Billable');
  const fetchedNonBillableRows = fetchedTaskRows.filter((row) => row.status === 'Non-Billable');

  const customTaskBreakdownRows = customTaskHours.map(customHoursEntryToTaskBreakdownRow);
  const taskBreakdown = [...fetchedBillableRows, ...customTaskBreakdownRows];

  const baseBillableHours = roundHours(
    summary.totalBillableHours !== '—'
      ? parseHoursNumber(summary.totalBillableHours)
      : fetchedBillableRows.reduce((sum, row) => sum + row.hours, 0),
  );

  const totalBillableHours = roundHours(baseBillableHours + additionalBillableHours);

  const totalNonBillableHours = roundHours(
    summary.totalNonBillableHours !== '—'
      ? parseHoursNumber(summary.totalNonBillableHours)
      : fetchedNonBillableRows.reduce((sum, row) => sum + row.hours, 0),
  );

  const baseLoggedHours =
    summary.totalLoggedHours !== '—'
      ? parseHoursNumber(summary.totalLoggedHours)
      : baseBillableHours + totalNonBillableHours;

  const totalLoggedHours = roundHours(baseLoggedHours + additionalBillableHours);

  const billableHoursBreakdown = addPmHoursToBreakdown(
    buildBillableBreakdown(fetchedBillableRows),
    pmHours,
  );

  const period = {
    startDate: summary.startDate,
    endDate: summary.endDate,
    formatted: formatPeriod(summary.startDate, summary.endDate),
  };

  const project = {
    id: summary.projectId,
    name: summary.projectName,
    clientName: projectMeta?.clientName ?? null,
  };

  const emailSubtitle = project.name;

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    project,
    period,
    summary: {
      totalBillableHours,
      totalNonBillableHours,
      totalLoggedHours,
    },
    billableHoursBreakdown,
    taskBreakdown,
    signature,
    email: {
      subject: `Monthly Time & Billing Report — ${project.name} (${period.formatted})`,
      preheader: `${totalBillableHours.toFixed(2)} billable hours for ${project.name}`,
      title: 'Monthly Time & Billing Report',
      subtitle: emailSubtitle,
    },
  };
}

export function formatReportHours(hours: number): string {
  return hours.toFixed(2);
}

export function getSignatureDetail(signature: TaskHoursReportSignature): string {
  const designation = signature.designation?.trim();
  return designation || signature.email;
}
