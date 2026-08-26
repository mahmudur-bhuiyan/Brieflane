import type {
  CustomHoursEntry,
  CustomHoursFormState,
  CustomHoursType,
} from '../types/customHours';

export const PM_HOURS_JOB_TYPE = 'Project Management';
export const PM_HOURS_DESCRIPTION = 'PM hours';

export function createEmptyCustomHoursForm(defaultUserName = ''): CustomHoursFormState {
  return {
    type: 'pm',
    userName: defaultUserName,
    jobType: '',
    description: '',
    hours: '',
  };
}

export function parseCustomHoursInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

export function getCustomHoursTotal(entries: CustomHoursEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.hours, 0);
}

export function splitCustomHours(entries: CustomHoursEntry[]): {
  pmHours: CustomHoursEntry[];
  customTaskHours: CustomHoursEntry[];
} {
  return {
    pmHours: entries.filter((entry) => entry.type === 'pm'),
    customTaskHours: entries.filter((entry) => entry.type === 'custom'),
  };
}

export function getPmCustomHoursTotal(entries: CustomHoursEntry[]): number {
  return splitCustomHours(entries).pmHours.reduce((sum, entry) => sum + entry.hours, 0);
}

export function getCustomTaskHoursTotal(entries: CustomHoursEntry[]): number {
  return splitCustomHours(entries).customTaskHours.reduce((sum, entry) => sum + entry.hours, 0);
}

export function validateCustomHoursForm(form: CustomHoursFormState): string | null {
  const hours = parseCustomHoursInput(form.hours);
  if (hours === null) {
    return 'Enter a valid hours value greater than zero';
  }

  if (!form.userName.trim()) {
    return 'Enter a user name';
  }

  if (form.type === 'custom') {
    if (!form.jobType.trim()) {
      return 'Enter a job type or category';
    }

    if (!form.description.trim()) {
      return 'Enter a task description';
    }
  }

  return null;
}

export function buildCustomHoursEntry(form: CustomHoursFormState): CustomHoursEntry | null {
  const error = validateCustomHoursForm(form);
  if (error) {
    return null;
  }

  const hours = parseCustomHoursInput(form.hours);
  if (hours === null) {
    return null;
  }

  const userName = form.userName.trim();
  const isPm = form.type === 'pm';

  return {
    id: crypto.randomUUID(),
    type: form.type,
    userName,
    jobType: isPm ? PM_HOURS_JOB_TYPE : form.jobType.trim(),
    description: isPm ? PM_HOURS_DESCRIPTION : form.description.trim(),
    hours,
  };
}

export function getCustomHoursTypeLabel(type: CustomHoursType): string {
  return type === 'pm' ? 'PM hours' : 'Custom hours';
}
