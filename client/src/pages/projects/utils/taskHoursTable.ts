export type TaskHoursTableRow = {
  id: string;
  values: Record<string, string>;
};

export type ParsedTaskHoursTable = {
  columns: string[];
  rows: TaskHoursTableRow[];
};

export type TaskHoursSummary = {
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  totalBillableHours: string;
  totalNonBillableHours: string;
  totalLoggedHours: string;
};

export type TaskHoursColumnAlign = 'left' | 'center' | 'right';

export type TaskHoursDisplayColumn = {
  id: string;
  header: string;
  width: number;
  align: TaskHoursColumnAlign;
};

/** Curated columns matching the task-hours reference layout. */
export const TASK_HOURS_DISPLAY_COLUMNS: TaskHoursDisplayColumn[] = [
  { id: 'user_name', header: 'User Name', width: 16, align: 'left' },
  { id: 'job_type', header: 'Job Type', width: 18, align: 'left' },
  { id: 'task_id', header: 'Task ID', width: 10, align: 'center' },
  { id: 'task_name', header: 'Task Description', width: 32, align: 'left' },
  { id: 'hours', header: 'Hours', width: 12, align: 'center' },
  { id: 'status', header: 'Status', width: 12, align: 'center' },
];

const DISPLAY_COLUMN_WIDTHS: Record<string, number> = {
  user_name: 16,
  job_type: 18,
  task_id: 10,
  task_name: 32,
  task: 32,
  hours: 12,
  task_billable_hours: 12,
  task_non_billable_hours: 12,
  task_total_logged_hours: 12,
  status: 12,
  billable_status: 12,
};

const DISPLAY_COLUMN_ALIGN: Record<string, TaskHoursColumnAlign> = {
  user_name: 'left',
  job_type: 'left',
  task_id: 'center',
  task_name: 'left',
  task: 'left',
  name: 'left',
  email: 'left',
  user_email: 'left',
  summary: 'left',
  hours: 'center',
  task_billable_hours: 'center',
  task_non_billable_hours: 'center',
  task_total_logged_hours: 'center',
  status: 'center',
  billable_status: 'center',
};

const ARRAY_KEYS = [
  'data',
  'results',
  'items',
  'records',
  'users',
  'tasks',
  'time_records',
  'rows',
  'entries',
  'user_task_hours',
  'task_hours',
  'project_user_task_hours',
  'users_task_hours',
];

const METADATA_KEYS = new Set([
  'success',
  'status',
  'message',
  'error',
  'project_id',
  'project_name',
  'start_date',
  'end_date',
  'total_billable_hours',
  'total_non_billable_hours',
  'total_logged_hours',
  'user_total_billable_hours',
  'user_total_non_billable_hours',
  'user_total_logged_hours',
]);

const PREFERRED_COLUMN_ORDER = [
  'user_id',
  'user_name',
  'name',
  'email',
  'user_email',
  'job_type',
  'job_type_id',
  'task_id',
  'task_name',
  'task',
  'parent_type',
  'parent_id',
  'hours',
  'value',
  'tracked_time',
  'time',
  'duration',
  'task_billable_hours',
  'task_non_billable_hours',
  'task_total_logged_hours',
  'billable_status',
  'record_date',
  'date',
  'start_date',
  'end_date',
  'summary',
];

const HOUR_KEYS = new Set(['hours', 'value', 'tracked_time', 'time', 'duration', 'total_hours']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function formatHours(value: number): string {
  const wholeHours = Math.floor(value);
  const minutes = Math.round((value - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}

function formatDateValue(value: string | number): string {
  const date =
    typeof value === 'number'
      ? new Date(value > 1_000_000_000_000 ? value : value * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

function extractDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }

    if (value.every((entry) => ['string', 'number', 'boolean'].includes(typeof entry))) {
      return value.map((entry) => String(entry)).join(', ');
    }

    return value.map((entry) => extractDisplayValue(entry)).join(', ');
  }

  if (isRecord(value)) {
    const name =
      value.name ?? value.title ?? value.label ?? value.task_name ?? value.user_name ?? value.email;

    if (typeof name === 'string' && name.trim()) {
      const id = value.id ?? value.task_id ?? value.user_id;
      if (typeof id === 'number' || typeof id === 'string') {
        return `${name.trim()} (${id})`;
      }

      return name.trim();
    }

    const scalarEntries = Object.entries(value).filter(
      ([, entry]) => entry === null || ['string', 'number', 'boolean'].includes(typeof entry),
    );

    if (scalarEntries.length > 0) {
      return scalarEntries.map(([key, entry]) => `${key}: ${entry}`).join(', ');
    }
  }

  return '—';
}

function formatScalarValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    if (HOUR_KEYS.has(key) || key.endsWith('_hours')) {
      return formatHours(value);
    }

    if (
      (key.includes('date') || key.endsWith('_on') || key.endsWith('_at')) &&
      value > 1_000_000_000 &&
      value < 10_000_000_000
    ) {
      return formatDateValue(value);
    }

    return String(value);
  }

  if (typeof value === 'string') {
    if (isIsoDateString(value)) {
      return formatDateValue(value);
    }

    return value;
  }

  return extractDisplayValue(value);
}

function buildRowId(values: Record<string, string>, index: number): string {
  const signature = Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

  return `${index}-${signature}`;
}

function collectObjectArrays(value: unknown, found: unknown[][] = []): unknown[][] {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((entry) => isRecord(entry))) {
      found.push(value);
    }

    for (const entry of value) {
      collectObjectArrays(entry, found);
    }

    return found;
  }

  if (!isRecord(value)) {
    return found;
  }

  for (const entry of Object.values(value)) {
    collectObjectArrays(entry, found);
  }

  return found;
}

function scoreCandidateRows(rows: unknown[]): number {
  return rows.reduce<number>((score, row) => {
    if (!isRecord(row)) {
      return score;
    }

    const nestedItemCount = Object.values(row).reduce<number>((count, value) => {
      if (Array.isArray(value) && value.some((entry) => isRecord(entry))) {
        return count + value.length;
      }
      return count;
    }, 0);

    return score + 1 + nestedItemCount;
  }, 0);
}

function findArrayItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!isRecord(data)) {
    return [];
  }

  for (const key of ARRAY_KEYS) {
    const candidate = data[key];
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  for (const key of ARRAY_KEYS) {
    const wrapper = data[key];
    if (isRecord(wrapper)) {
      for (const innerKey of ARRAY_KEYS) {
        const candidate = (wrapper as Record<string, unknown>)[innerKey];
        if (Array.isArray(candidate) && candidate.length > 0) {
          return candidate;
        }
      }
    }
  }

  const nestedArrays = collectObjectArrays(data);
  if (nestedArrays.length > 0) {
    return nestedArrays.sort((a, b) => scoreCandidateRows(b) - scoreCandidateRows(a))[0];
  }

  const values = Object.values(data).filter((value) => isRecord(value));
  if (values.length > 0) {
    return values;
  }

  return [data];
}

function flattenScalars(
  item: Record<string, unknown>,
  prefix = '',
  inherited: Record<string, string> = {},
): Record<string, string> {
  const result = { ...inherited };

  for (const [key, value] of Object.entries(item)) {
    if (METADATA_KEYS.has(key)) {
      continue;
    }

    const columnKey = prefix ? `${prefix}.${key}` : key;

    if (Array.isArray(value)) {
      if (value.length > 0 && value.every((entry) => isRecord(entry))) {
        continue;
      }

      result[columnKey] = formatScalarValue(key, value);
      continue;
    }

    if (isRecord(value)) {
      const children = getChildRecords(value);
      if (children.length > 0) {
        continue;
      }

      const nestedScalars = flattenScalars(value, columnKey, {});
      Object.assign(result, nestedScalars);
      continue;
    }

    result[columnKey] = formatScalarValue(key, value);
  }

  return result;
}

function getChildRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is Record<string, unknown> => isRecord(entry));
  }

  if (isRecord(value)) {
    return Object.values(value).filter((entry): entry is Record<string, unknown> =>
      isRecord(entry),
    );
  }

  return [];
}

function flattenRecord(
  item: Record<string, unknown>,
  inherited: Record<string, string> = {},
): Record<string, string>[] {
  const childGroups: Record<string, unknown>[] = [];

  for (const [key, value] of Object.entries(item)) {
    if (METADATA_KEYS.has(key)) {
      continue;
    }

    const children = getChildRecords(value);
    if (children.length > 0) {
      childGroups.push(...children);
    }
  }

  const baseScalars = flattenScalars(item, '', inherited);

  if (childGroups.length === 0) {
    return Object.keys(baseScalars).length > 0 ? [baseScalars] : [];
  }

  const rows: Record<string, string>[] = [];

  for (const child of childGroups) {
    rows.push(...flattenRecord(child, baseScalars));
  }

  return rows;
}

function sortColumns(columns: string[]): string[] {
  const preferredIndex = new Map(PREFERRED_COLUMN_ORDER.map((key, index) => [key, index]));

  return [...columns].sort((a, b) => {
    const aLeaf = a.split('.').pop() ?? a;
    const bLeaf = b.split('.').pop() ?? b;
    const aIndex = preferredIndex.get(aLeaf) ?? preferredIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = preferredIndex.get(bLeaf) ?? preferredIndex.get(b) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });
}

export function formatTaskHoursColumnHeader(key: string): string {
  const leaf = key.split('.').pop() ?? key;

  if (leaf === 'task_name' || leaf === 'task') {
    return 'Task Description';
  }

  if (leaf === 'task_id') {
    return 'Task ID';
  }

  if (leaf === 'user_name') {
    return 'User Name';
  }

  if (leaf === 'job_type') {
    return 'Job Type';
  }

  return leaf.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function readSummaryScalar(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];

  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  return null;
}

export function parseTaskHoursSummary(data: unknown): TaskHoursSummary | null {
  if (!isRecord(data)) {
    return null;
  }

  const nested = isRecord(data.data) ? data.data : null;
  const source = nested ?? data;

  const projectId = readSummaryScalar(source, 'project_id');
  const projectName = readSummaryScalar(source, 'project_name');
  const startDate = readSummaryScalar(source, 'start_date');
  const endDate = readSummaryScalar(source, 'end_date');
  const totalBillableHours = readSummaryScalar(source, 'total_billable_hours');
  const totalNonBillableHours = readSummaryScalar(source, 'total_non_billable_hours');
  const totalLoggedHours = readSummaryScalar(source, 'total_logged_hours');

  if (
    !projectId &&
    !projectName &&
    !startDate &&
    !endDate &&
    !totalBillableHours &&
    !totalNonBillableHours &&
    !totalLoggedHours
  ) {
    return null;
  }

  return {
    projectId: projectId ?? '—',
    projectName: projectName ?? '—',
    startDate: startDate ?? '—',
    endDate: endDate ?? '—',
    totalBillableHours: totalBillableHours ?? '—',
    totalNonBillableHours: totalNonBillableHours ?? '—',
    totalLoggedHours: totalLoggedHours ?? '—',
  };
}

export function getTaskHoursColumnWidth(columnKey: string, columnCount: number): number {
  const leaf = columnKey.split('.').pop() ?? columnKey;
  return DISPLAY_COLUMN_WIDTHS[leaf] ?? Math.max(8, Math.floor(100 / Math.max(columnCount, 1)));
}

export function getTaskHoursColumnAlign(columnKey: string): TaskHoursColumnAlign {
  const leaf = columnKey.split('.').pop() ?? columnKey;

  if (DISPLAY_COLUMN_ALIGN[leaf]) {
    return DISPLAY_COLUMN_ALIGN[leaf];
  }

  if (leaf.includes('name') || leaf.includes('summary') || leaf.includes('email')) {
    return 'left';
  }

  if (
    leaf === 'hours' ||
    leaf === 'value' ||
    leaf === 'tracked_time' ||
    leaf === 'time' ||
    leaf === 'duration' ||
    leaf.endsWith('_hours') ||
    leaf === 'task_id' ||
    leaf.endsWith('_id') ||
    leaf === 'status' ||
    leaf === 'billable_status'
  ) {
    return 'center';
  }

  return 'left';
}

function parseHoursNumber(value: string | undefined): number {
  if (!value || value === '—') {
    return 0;
  }

  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDecimalHours(value: number): string {
  return value.toFixed(2);
}

function toCuratedDisplayRows(flatRows: Record<string, string>[]): TaskHoursTableRow[] | null {
  const looksLikeTaskHours = flatRows.some(
    (row) =>
      (row.user_name || row.name) &&
      (row.task_name || row.task) &&
      (row.job_type ||
        row.task_billable_hours !== undefined ||
        row.task_non_billable_hours !== undefined),
  );

  if (!looksLikeTaskHours) {
    return null;
  }

  const displayRows: TaskHoursTableRow[] = [];

  flatRows.forEach((row, index) => {
    const userName = (row.user_name || row.name || '—').trim() || '—';
    const jobType = (row.job_type || '—').trim() || '—';
    const taskId = (row.task_id || '—').trim() || '—';
    const taskName = (row.task_name || row.task || '—').trim() || '—';
    const billable = parseHoursNumber(row.task_billable_hours);
    const nonBillable = parseHoursNumber(row.task_non_billable_hours);

    const pushRow = (hours: number, status: 'Billable' | 'Non-Billable') => {
      const values = {
        user_name: userName,
        job_type: jobType,
        task_id: taskId,
        task_name: taskName,
        hours: formatDecimalHours(hours),
        status,
      };

      displayRows.push({
        id: buildRowId(values, displayRows.length + index),
        values,
      });
    };

    if (billable > 0) {
      pushRow(billable, 'Billable');
    }

    if (nonBillable > 0) {
      pushRow(nonBillable, 'Non-Billable');
    }

    if (billable <= 0 && nonBillable <= 0) {
      const total = parseHoursNumber(row.task_total_logged_hours || row.hours);
      pushRow(total, 'Billable');
    }
  });

  return displayRows;
}

export function parseTaskHoursTable(data: unknown): ParsedTaskHoursTable {
  const items = findArrayItems(data);
  const columnSet = new Set<string>();
  const flatRows: Record<string, string>[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }

    for (const row of flattenRecord(item)) {
      flatRows.push(row);
      for (const key of Object.keys(row)) {
        columnSet.add(key);
      }
    }
  }

  const curatedRows = toCuratedDisplayRows(flatRows);
  if (curatedRows) {
    return {
      columns: TASK_HOURS_DISPLAY_COLUMNS.map((column) => column.id),
      rows: curatedRows,
    };
  }

  const columns = sortColumns([...columnSet]);
  const rows = flatRows.map((values, index) => ({
    id: buildRowId(values, index),
    values,
  }));

  return { columns, rows };
}

function getRowBillableStatus(row: TaskHoursTableRow): string {
  return (row.values.status ?? row.values.billable_status ?? '').trim().toLowerCase();
}

export function isNonBillableTaskHoursRow(row: TaskHoursTableRow): boolean {
  return getRowBillableStatus(row) === 'non-billable';
}

export function filterTaskHoursRowsByBillableStatus(
  rows: TaskHoursTableRow[],
  showNonBillable: boolean,
): TaskHoursTableRow[] {
  if (showNonBillable) {
    return rows;
  }

  return rows.filter((row) => !isNonBillableTaskHoursRow(row));
}

export function getBillableOnlySummary(summary: TaskHoursSummary): TaskHoursSummary {
  return {
    ...summary,
    totalLoggedHours: summary.totalBillableHours,
  };
}

export function mergeCustomHoursIntoSummary(
  summary: TaskHoursSummary,
  additionalBillableHours: number,
): TaskHoursSummary {
  if (additionalBillableHours <= 0) {
    return summary;
  }

  const billable = parseHoursNumber(summary.totalBillableHours) + additionalBillableHours;
  const nonBillable = parseHoursNumber(summary.totalNonBillableHours);
  const loggedFromSummary = parseHoursNumber(summary.totalLoggedHours);
  const logged =
    loggedFromSummary > 0 ? loggedFromSummary + additionalBillableHours : billable + nonBillable;

  return {
    ...summary,
    totalBillableHours: formatDecimalHours(billable),
    totalLoggedHours: formatDecimalHours(logged),
  };
}

export function customHoursToTableRows(
  entries: Array<{
    id: string;
    userName: string;
    jobType: string;
    description: string;
    hours: number;
  }>,
): TaskHoursTableRow[] {
  return entries.map((entry) => ({
    id: `custom-${entry.id}`,
    values: {
      user_name: entry.userName,
      job_type: entry.jobType,
      task_id: '—',
      task_name: entry.description,
      hours: formatDecimalHours(entry.hours),
      status: 'Billable',
    },
  }));
}

export function filterTaskHoursRows(
  rows: TaskHoursTableRow[],
  search: string,
): TaskHoursTableRow[] {
  const query = search.trim().toLowerCase();

  if (!query) {
    return rows;
  }

  return rows.filter((row) =>
    Object.values(row.values).some((value) => value.toLowerCase().includes(query)),
  );
}

export function sortTaskHoursRows(
  rows: TaskHoursTableRow[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
): TaskHoursTableRow[] {
  const direction = sortOrder === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const aValue = a.values[sortBy] ?? '';
    const bValue = b.values[sortBy] ?? '';

    const aNumber = Number(aValue.replace(/[^\d.-]/g, ''));
    const bNumber = Number(bValue.replace(/[^\d.-]/g, ''));

    if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber) && aValue !== '' && bValue !== '') {
      return direction * (aNumber - bNumber);
    }

    return (
      direction * aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
    );
  });
}
