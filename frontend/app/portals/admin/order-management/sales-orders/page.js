"use client";

import Link from "next/link";
import AdminShell from "../../components/AdminShell";

export default function SalesOrdersPageDeprecated() {
  return (
    <AdminShell title="Order Management" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Sales Orders Screen Replaced</div>
        <div className="text-sm text-zinc-600 mt-2">
          The old Create Sales Order and Sales Order List flow has been removed.
          Use the new Primary/Secondary cards on the Order Management overview.
        </div>
        <Link
          href="/portals/admin/order-management"
          className="inline-flex mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Open New Order Management
        </Link>
      </div>
    </AdminShell>
  );
}