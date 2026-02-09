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

export default function FinanceReceiptsPage() {
  const now = useNow();
  return (
    <AdminShell title="Receipts" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xl font-semibold text-zinc-900">Receipts</div>
          <div className="rounded-full border bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
            {now.toLocaleString()}
          </div>
        </div>
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