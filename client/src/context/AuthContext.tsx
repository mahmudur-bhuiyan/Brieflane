import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser, LoginInput, LoginResponse, MeResponse } from '../types/auth';
import { apiFetch, clearToken, getToken, setToken } from '../lib/api';
import { queryKeys } from '../lib/queries/keys';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiFetch<MeResponse>('/api/auth/me'),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      clearToken();
      setTokenState(null);
    }
  }, [isError]);

  const user = token && !isError ? (data?.user ?? null) : null;
  const loading = Boolean(token) && isPending;

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      setToken(response.token);
      setTokenState(response.token);
      queryClient.setQueryData<MeResponse>(queryKeys.auth.me, { user: response.user });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // clear local session even if API call fails
    }

    clearToken();
    setTokenState(null);
    queryClient.removeQueries({ queryKey: queryKeys.auth.me });
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
