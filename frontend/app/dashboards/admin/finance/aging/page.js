"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

export default function FinanceAgingPage() {
  const now = useNow();
  return (
    <AdminShell title="Aging Report" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xl font-semibold text-zinc-900">Aging Report</div>
          <div className="rounded-full border bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
            {now.toLocaleString()}
          </div>
        </div>
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