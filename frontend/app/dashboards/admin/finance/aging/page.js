"use client";

import AdminShell from "../../components/AdminShell";

export default function FinanceAgingPage() {
  return (
    <AdminShell title="Aging Report" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Aging Report</div>
        <div className="text-sm text-zinc-500 mt-1">
          Review outstanding balances by customer aging buckets.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No aging data yet. Generate invoices and receipts to populate this report.
        </div>
      </div>
    </AdminShell>
  );
}
