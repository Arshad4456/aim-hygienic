"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthStorage, getAuthItem } from "./clientAuth";
import { clearRuntimeDashboard, fetchRuntimeDashboard, getRuntimeDashboard } from "./runtimeDashboard";

const RuntimeDashboardContext = createContext(null);

export function RuntimeDashboardProvider({ children }) {
  const [dashboard, setDashboard] = useState(() => getRuntimeDashboard());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const token = getAuthItem("aim_token");
    if (!token) {
      setDashboard(null);
      return null;
    }

    setLoading(true);
    setError("");
    try {
      const next = await fetchRuntimeDashboard();
      setDashboard(next);
      return next;
    } catch (err) {
      const msg = err?.message || "Failed to load runtime dashboard";
      setError(msg);
      if (/token|unauthorized|invalid/i.test(msg)) {
        clearRuntimeDashboard();
        clearAuthStorage();
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    clearRuntimeDashboard();
    setDashboard(null);
    setError("");
  }

  useEffect(() => {
    const token = getAuthItem("aim_token");
    if (!token || dashboard) return;
    refresh().catch(() => undefined);
  }, [dashboard]);

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
    [dashboard, loading, error],
  );

  return <RuntimeDashboardContext.Provider value={value}>{children}</RuntimeDashboardContext.Provider>;
}

export function useRuntimeDashboardContext() {
  const context = useContext(RuntimeDashboardContext);
  if (!context) throw new Error("useRuntimeDashboardContext must be used within RuntimeDashboardProvider");
  return context;
}