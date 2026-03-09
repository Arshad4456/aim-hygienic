"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  { title: "Supplier Master", description: "Maintain ERP supplier records with payment terms.", href: "/dashboards/admin/procurement/suppliers" },
  { title: "Purchase Orders", description: "Create and track PO lifecycle from approval to close.", href: "/dashboards/admin/procurement/purchase-orders" },
  { title: "Goods Receipt (GRN)", description: "Post warehouse receipts and update inventory movements.", href: "/dashboards/admin/procurement/grn" },
  { title: "Supplier Payments", description: "Track due, partial, and paid settlements for suppliers.", href: "/dashboards/admin/procurement/payments" },
];

export default function ProcurementModulePage() {
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch("/procurement/summary");
        setReport(data || null);
        setErr("");
      } catch (e) {
        setErr(e.message || "Failed to load procurement summary");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => [
    { label: "Suppliers", value: formatNumber(report?.kpis?.totalSuppliers) },
    { label: "Purchase Orders", value: formatNumber(report?.kpis?.totalPurchaseOrders) },
    { label: "GRNs", value: formatNumber(report?.kpis?.totalReceipts) },
    { label: "Qty Received", value: formatNumber(report?.kpis?.totalQuantity) },
    { label: "Pending Payments", value: formatNumber(report?.kpis?.pendingPayments) },
    { label: "Payments Total", value: formatCurrency(report?.kpis?.paymentAmount) },
  ], [report]);

  return (
    <AdminShell title="Procurement" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">ERP Procurement Control Tower</div>
          <div className="text-sm text-zinc-500 mt-1">Both web and mobile use the same backend APIs for suppliers, PO, GRN, and payments.</div>
          {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((m) => <Kpi key={m.label} item={m} />)}</div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => <Link key={card.title} href={card.href} className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow"><div className="text-sm font-semibold text-zinc-900">{card.title}</div><div className="text-xs text-zinc-500 mt-2">{card.description}</div></Link>)}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Kpi({ item }) { return <div className="rounded-2xl border bg-zinc-50 p-4"><div className="text-xs text-zinc-500">{item.label}</div><div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div></div>; }
function formatNumber(value) { return value === null || value === undefined ? "—" : Number(value).toLocaleString(); }
function formatCurrency(value) { return value === null || value === undefined ? "—" : `₨ ${Number(value).toLocaleString()}`; }
