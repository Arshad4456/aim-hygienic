import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRuntimeDashboard } from './runtimeDashboardApi';
import { useAuth } from '../auth/useAuth';

export const RuntimeDashboardContext = createContext(null);

export function RuntimeDashboardProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      return null;
    }

    setLoading(true);
    setError('');
    try {
      const next = await fetchRuntimeDashboard();
      setDashboard(next);
      return next;
    } catch (err) {
      setError(err.message || 'Failed to load runtime dashboard');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const clear = useCallback(() => {
    setDashboard(null);
    setError('');
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }
    refresh().catch(() => undefined);
  }, [isAuthenticated, refresh, clear]);

  const value = useMemo(
    () => ({
      dashboard,
      loading,
      error,
      refresh,
      clear,
      company: dashboard?.company || null,
      settings: dashboard?.settings || null,
      hierarchy: dashboard?.hierarchy || null,
      role: dashboard?.role || null,
      shell: dashboard?.shell || null,
      modules: dashboard?.modules || [],
    }),
    [dashboard, loading, error, refresh, clear]
  );

  return <RuntimeDashboardContext.Provider value={value}>{children}</RuntimeDashboardContext.Provider>;
}
