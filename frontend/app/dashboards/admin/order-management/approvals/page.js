"use client";

import AdminShell from "../../components/AdminShell";

export default function OrderApprovalsPage() {
  return (
    <AdminShell title="Order Approvals" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Order Approvals</div>
        <div className="text-sm text-zinc-500 mt-1">
          Review orders for credit limits, pricing, and stock availability.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          Approval queue is empty. Configure approval rules to surface pending orders.
        </div>
      </div>
    </AdminShell>
  );
}
