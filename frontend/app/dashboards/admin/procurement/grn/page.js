"use client";

import AdminShell from "../../components/AdminShell";

export default function GrnPage() {
  return (
    <AdminShell title="Goods Receipt (GRN)" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Goods Receipt (GRN)</div>
        <div className="text-sm text-zinc-500 mt-1">
          Record received goods, QC status, batches, and warehouse placement.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No receipts yet. Link GRN entries to purchase orders and inventory movements.
        </div>
      </div>
    </AdminShell>
  );
}