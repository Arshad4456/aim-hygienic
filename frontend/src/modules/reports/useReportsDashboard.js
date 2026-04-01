"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../app/lib/api";

export function useReportsDashboard({ companyId = "", companyName = "" } = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (companyId) query.set("companyId", companyId);
      if (companyName) query.set("companyName", companyName);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      const data = await apiFetch(`/reports/dashboard${suffix}`);
      setDashboard(data);
    } catch (e) {
      setError(e.message || "Failed to load reports dashboard");
    } finally {
      setLoading(false);
    }
  }, [companyId, companyName]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, dashboard, reload };
}