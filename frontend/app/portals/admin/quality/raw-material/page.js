"use client";

import AdminShell from "../../components/AdminShell";

export default function RawMaterialQcPage() {
  return (
    <AdminShell title="Raw Material QC" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Raw Material QC</div>
        <div className="text-sm text-zinc-500 mt-1">
          Inspect raw materials and capture QC status before GRN.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No QC entries yet. Record inspection results for incoming goods.
        </div>
      </div>
    </AdminShell>
  );
}