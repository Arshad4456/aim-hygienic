"use client";

import AdminShell from "../../components/AdminShell";

export default function FinanceReceiptsPage() {
  return (
    <AdminShell title="Receipts" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Receipts</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track customer receipts, collections, and payment methods.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No receipts logged yet. Add receipts to reconcile outstanding invoices.
        </div>
      </div>
    </AdminShell>
  );
}
