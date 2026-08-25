import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  applyTheme,
  getStoredTheme,
  saveTheme,
  type Theme,
} from '../lib/theme-storage';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme(null));

  useEffect(() => {
    if (loading) return;
    setThemeState(getStoredTheme(user?.id ?? null));
  }, [user?.id, loading]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      saveTheme(user?.id ?? null, next);
    },
    [user?.id],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
