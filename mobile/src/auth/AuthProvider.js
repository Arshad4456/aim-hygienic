import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { configureApiClient } from '../api/client';
import { loginWithMobile } from '../api/auth';
import { clearSession, loadSession, saveSession } from './storage';
import { isKnownRole, roleToDashboardKey } from '../utils/roleRedirect';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    configureApiClient({
      tokenProvider: async () => token,
      unauthorizedHandler: logout,
    });
  }, [token, logout]);

  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session?.token) {
          setToken(session.token);
          setUser(session.user || null);
          setRole(session.role || session.user?.role || null);
        }
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  const login = useCallback(async ({ mobile, password }) => {
    const data = await loginWithMobile({ mobile, password });
    const nextToken = data?.token;
    const nextUser = data?.user || null;
    const nextRole = nextUser?.role || '';

    await saveSession({ token: nextToken, user: nextUser, role: nextRole });
    setToken(nextToken);
    setUser(nextUser);
    setRole(nextRole);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      role,
      roleKey: roleToDashboardKey(role),
      isKnownRole: isKnownRole(role),
      isAuthenticated: Boolean(token),
      isBootstrapping,
      login,
      logout,
    }),
    [token, user, role, isBootstrapping, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
