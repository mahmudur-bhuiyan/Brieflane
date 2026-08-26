const STORAGE_KEY = 'brieflane_project_task_hours';

type TaskHoursStorage = Record<string, unknown>;

function readStorage(): TaskHoursStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as TaskHoursStorage;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(storage: TaskHoursStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

export function getStoredTaskHours(projectId: string): unknown | null {
  const stored = readStorage()[projectId];
  return stored ?? null;
}

export function saveTaskHours(projectId: string, data: unknown): void {
  const storage = readStorage();
  storage[projectId] = data;
  writeStorage(storage);
}
