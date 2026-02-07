"use client";

import AdminShell from "../../components/AdminShell";

export default function PurchaseOrdersPage() {
  return (
    <AdminShell title="Purchase Orders" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Purchase Orders</div>
        <div className="text-sm text-zinc-500 mt-1">
          Create, approve, and track purchase orders per supplier and warehouse.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No purchase orders yet. Connect this to the inventory ledger for stock-in entries.
        </div>
      </div>
    </AdminShell>
  );
}