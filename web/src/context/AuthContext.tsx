import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiFetch } from '../lib/api';
import type { User } from '../types';

// 'loading' is the important one. On a refresh the app cannot know whether the
// cookie is valid until /me answers, and treating that gap as "logged out"
// would bounce an authenticated user to the login page on every reload.
type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Runs once on mount: the session lives in a cookie the app cannot read, so
  // the only way to learn who is signed in is to ask the server.
  useEffect(() => {
    let cancelled = false;

    apiFetch<{ user: User }>('/api/auth/me')
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // 401 simply means "not signed in" and is not worth logging.
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('Session check failed:', error);
        }
        setUser(null);
        setStatus('anonymous');
      });

    // Guards against setting state after the provider unmounts, which React
    // StrictMode makes easy to hit in development.
    return () => {
      cancelled = true;
    };
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: User }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<null>('/api/auth/logout', { method: 'POST' });
    } finally {
      // Clear locally even if the request failed. Leaving the UI in a
      // signed-in state after the user asked to leave is worse than a stale
      // row on the server, which expires on its own anyway.
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, signup, login, logout }),
    [user, status, signup, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
