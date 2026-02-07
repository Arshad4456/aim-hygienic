"use client";

import AdminShell from "../../components/AdminShell";

export default function FinanceInvoicesPage() {
  return (
    <AdminShell title="Invoices" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Invoices</div>
        <div className="text-sm text-zinc-500 mt-1">
          Issue invoices based on delivered sales orders.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No invoices generated yet. Create invoices when dispatch is confirmed.
        </div>
      </div>
    </AdminShell>
  );
}