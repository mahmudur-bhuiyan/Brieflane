export type TaskHoursTableRow = {
  id: string;
  values: Record<string, string>;
};

export type ParsedTaskHoursTable = {
  columns: string[];
  rows: TaskHoursTableRow[];
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
  'start_date',
  'end_date',
]);

const PREFERRED_COLUMN_ORDER = [
  'user_id',
  'user_name',
  'name',
  'email',
  'user_email',
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
  'billable_status',
  'record_date',
  'date',
  'start_date',
  'end_date',
  'summary',
  'job_type_id',
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
      value.name ??
      value.title ??
      value.label ??
      value.task_name ??
      value.user_name ??
      value.email;

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

    const nestedArrayCount = Object.values(row).filter(
      (value) => Array.isArray(value) && value.some((entry) => isRecord(entry)),
    ).length;

    return score + 1 + nestedArrayCount;
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
    return Object.values(value).filter((entry): entry is Record<string, unknown> => isRecord(entry));
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

  return leaf
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

  const columns = sortColumns([...columnSet]);
  const rows = flatRows.map((values, index) => ({
    id: buildRowId(values, index),
    values,
  }));

  return { columns, rows };
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

    return direction * aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
  });
}
