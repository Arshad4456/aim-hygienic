"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  {
    title: "Supplier Master",
    description: "Maintain supplier profiles and warehouse linkages.",
    href: "/dashboards/admin/procurement/suppliers",
  },
  {
    title: "Purchase Orders",
    description: "Track purchase order creation and approvals.",
    href: "/dashboards/admin/procurement/purchase-orders",
  },
  {
    title: "Goods Receipt (GRN)",
    description: "Record inbound receipts and update inventory.",
    href: "/dashboards/admin/procurement/grn",
  },
  {
    title: "Supplier Payments",
    description: "Monitor supplier payment status and settlements.",
    href: "/dashboards/admin/procurement/payments",
  },
];

export default function ProcurementModulePage() {
  const [report, setReport] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/procurement");
        setReport(data || null);
      } catch (e) {
        setErr(e.message || "Failed to load procurement report");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Total Suppliers", value: formatNumber(report?.kpis?.totalSuppliers) },
      { label: "Active Suppliers", value: formatNumber(report?.kpis?.activeSuppliers) },
      { label: "Purchase Receipts", value: formatNumber(report?.kpis?.totalReceipts) },
      { label: "Total Qty Received", value: formatNumber(report?.kpis?.totalQuantity) },
    ],
    [report],
  );

  const chartData = useMemo(() => {
    const fallback = [
      { label: "Mon", quantity: 0 },
      { label: "Tue", quantity: 0 },
      { label: "Wed", quantity: 0 },
      { label: "Thu", quantity: 0 },
      { label: "Fri", quantity: 0 },
      { label: "Sat", quantity: 0 },
      { label: "Sun", quantity: 0 },
    ];
    return report?.inboundTrend?.length ? report.inboundTrend : fallback;
  }, [report]);

  return (
    <AdminShell title="Procurement" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Procurement & Supplier Management</div>
              <div className="text-sm text-zinc-500 mt-1">
                Manage suppliers, purchase orders, GRNs, and payments with live inbound analytics.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Auto-refreshing every 30 seconds</div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow"
              >
                <div className="text-sm font-semibold text-zinc-900">{card.title}</div>
                <div className="text-xs text-zinc-500 mt-2">{card.description}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Inbound Receipts Trend (7 Days)</div>
          <div className="text-sm text-zinc-500 mt-1">
            Monitor GRN volume to keep procurement and inventory balanced.
          </div>
          <div className="mt-4">
            <BarChart data={chartData} />
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Recent Purchase Receipts</div>
          <div className="text-sm text-zinc-500 mt-1">
            Latest inbound movements captured from GRNs.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Product</th>
                  <th className="text-left px-3 py-2 border-b">Warehouse</th>
                  <th className="text-left px-3 py-2 border-b">Quantity</th>
                  <th className="text-left px-3 py-2 border-b">Received</th>
                </tr>
              </thead>
              <tbody>
                {report?.recentPurchases?.length ? (
                  report.recentPurchases.map((row) => (
                    <tr key={row._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b">{row.productName || row.productId}</td>
                      <td className="px-3 py-2 border-b">{row.warehouseName || row.warehouseId}</td>
                      <td className="px-3 py-2 border-b">{formatNumber(row.quantity)}</td>
                      <td className="px-3 py-2 border-b">
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                      No purchase receipts recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function BarChart({ data }) {
  const maxValue = Math.max(...data.map((item) => item.quantity), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-12 text-xs text-zinc-500">{item.label}</div>
          <div className="flex-1 h-3 rounded-full bg-zinc-100">
            <div
              className="h-3 rounded-full bg-emerald-500"
              style={{ width: `${Math.round((item.quantity / maxValue) * 100)}%` }}
            />
          </div>
          <div className="w-12 text-xs text-zinc-600 text-right">{item.quantity}</div>
        </div>
      ))}
    </div>
  );
}
