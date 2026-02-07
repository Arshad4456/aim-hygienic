"use client";

import AdminShell from "../../components/AdminShell";

export default function ProductionQcPage() {
  return (
    <AdminShell title="Production QC" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Production QC</div>
        <div className="text-sm text-zinc-500 mt-1">
          Monitor in-process quality checks during production.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No production QC records yet. Log QC checks for ongoing batches.
        </div>
      </div>
    </AdminShell>
  );
}
