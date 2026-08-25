export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'brieflane_user_themes';
const GUEST_KEY = '__guest__';

type ThemeStorage = Record<string, Theme>;

function readStorage(): ThemeStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ThemeStorage;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(themes: ThemeStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

function storageKey(userId: string | null): string {
  return userId ?? GUEST_KEY;
}

export function getStoredTheme(userId: string | null): Theme {
  const themes = readStorage();
  return themes[storageKey(userId)] ?? 'dark';
}

export function saveTheme(userId: string | null, theme: Theme): void {
  const themes = readStorage();
  themes[storageKey(userId)] = theme;
  writeStorage(themes);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
