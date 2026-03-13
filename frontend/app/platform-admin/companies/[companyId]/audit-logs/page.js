"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import AuditLogTable from "../../../components/AuditLogTable";
import AuditLogDetail from "../../../components/AuditLogDetail";

export default function CompanyAuditLogsPage() {
  const params = useParams();
  const companyId = params?.companyId;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/platform-admin/companies/${companyId}/audit-logs`);
        if (!mounted) return;
        setLogs(data.logs || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load company audit logs");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [companyId]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Company Audit Logs</h1>
        <p className="text-sm text-zinc-600">Company ID: {companyId}</p>
      </div>

      {loading ? <div className="text-sm">Loading audit logs...</div> : null}
      {error ? <div className="rounded border bg-white p-3 text-sm text-rose-600">{error}</div> : null}
      {!loading && !error ? <AuditLogTable logs={logs} onSelect={setSelectedLog} /> : null}

      <AuditLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}