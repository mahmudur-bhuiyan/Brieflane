import type { CustomHoursEntry } from '../types/customHours';

const STORAGE_KEY = 'brieflane_project_custom_hours';

type CustomHoursStorage = Record<string, CustomHoursEntry[]>;

function readStorage(): CustomHoursStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as CustomHoursStorage;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(storage: CustomHoursStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

export function getStoredCustomHours(projectId: string): CustomHoursEntry[] {
  return readStorage()[projectId] ?? [];
}

export function saveCustomHours(projectId: string, entries: CustomHoursEntry[]): void {
  const storage = readStorage();
  storage[projectId] = entries;
  writeStorage(storage);
}
