"use client";

import AdminShell from "../../components/AdminShell";

export default function FinishedGoodsQcPage() {
  return (
    <AdminShell title="Finished Goods QC" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Finished Goods QC</div>
        <div className="text-sm text-zinc-500 mt-1">
          Validate finished goods before warehouse release.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No finished goods QC entries yet. Add QC results before final release.
        </div>
      </div>
    </AdminShell>
  );
}
