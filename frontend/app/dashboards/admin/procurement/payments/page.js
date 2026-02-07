"use client";

import AdminShell from "../../components/AdminShell";

export default function SupplierPaymentsPage() {
  return (
    <AdminShell title="Supplier Payments" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Supplier Payments</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track supplier invoices, due dates, and payment status.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No payment records yet. Configure payment terms per supplier.
        </div>
      </div>
    </AdminShell>
  );
}