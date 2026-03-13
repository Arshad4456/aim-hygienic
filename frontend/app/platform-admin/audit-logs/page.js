"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import AuditLogFilters from "../components/AuditLogFilters";
import AuditLogTable from "../components/AuditLogTable";
import AuditLogDetail from "../components/AuditLogDetail";

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") params.set(k, String(v).trim());
  });
  return params.toString();
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({});
  const [appliedFilters, setAppliedFilters] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const query = useMemo(() => buildQuery(appliedFilters), [appliedFilters]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/platform-admin/audit-logs${query ? `?${query}` : ""}`);
        if (!mounted) return;
        setLogs(data.logs || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load audit logs");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [query]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Platform Audit Logs</h1>
        <p className="text-sm text-zinc-600">Track important platform and company configuration actions.</p>
      </div>

      <AuditLogFilters filters={filters} onChange={setFilters} onApply={() => setAppliedFilters(filters)} />

      {loading ? <div className="text-sm">Loading audit logs...</div> : null}
      {error ? <div className="rounded border bg-white p-3 text-sm text-rose-600">{error}</div> : null}
      {!loading && !error ? <AuditLogTable logs={logs} onSelect={setSelectedLog} /> : null}

      <AuditLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
