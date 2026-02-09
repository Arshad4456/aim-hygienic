"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  {
    title: "Sales Orders",
    description: "Capture customer, distributor, or salesman orders.",
    href: "/dashboards/admin/order-management/sales-orders",
  },
  {
    title: "Order Approvals",
    description: "Approve orders based on credit limits and stock checks.",
    href: "/dashboards/admin/order-management/approvals",
  },
  {
    title: "Pick & Dispatch",
    description: "Allocate inventory, pick, pack, and dispatch orders.",
    href: "/dashboards/admin/order-management/dispatch",
  },
  {
    title: "Returns & Claims",
    description: "Handle RMA, claims, and replacements.",
    href: "/dashboards/admin/order-management/returns",
  },
];

export default function OrderManagementModulePage() {
  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadSummary() {
      setErr("");
      try {
        const data = await apiFetch("/orders/summary");
        setSummary(data.summary || null);
        setRecentOrders(data.recentOrders || []);
      } catch (e) {
        setErr(e.message || "Failed to load order summary");
      }
    }
    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Orders", value: formatNumber(summary?.total) },
      { label: "Pending Approval", value: formatNumber(summary?.pending) },
      { label: "Approved", value: formatNumber(summary?.approved) },
      { label: "Dispatched", value: formatNumber(summary?.dispatched) },
      { label: "Completed", value: formatNumber(summary?.completed) },
      { label: "Order Value", value: formatCurrency(summary?.totalAmount) },
    ],
    [summary],
  );

  return (
    <AdminShell title="Order Management" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Order Management Module</div>
              <div className="text-sm text-zinc-500 mt-1">
                Manage the end-to-end sales order lifecycle from request to delivery.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Auto-refreshing every 30 seconds</div>
            <Link
              href="/dashboards/admin/order-management/sales-orders"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Create Sales Order
            </Link>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{stat.label}</div>
                <div className="mt-2 text-lg font-semibold text-zinc-900">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Module Shortcuts</div>
          <div className="text-sm text-zinc-500 mt-1">
            Jump into approvals, dispatch planning, and claims management.
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="text-lg font-semibold text-zinc-900">Recent Orders</div>
          <div className="text-sm text-zinc-500 mt-1">
            Latest sales orders waiting for approval and dispatch.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Order No</th>
                  <th className="text-left px-3 py-2 border-b">Customer</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Order Value</th>
                  <th className="text-left px-3 py-2 border-b">Order Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length ? (
                  recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                      <td className="px-3 py-2 border-b">{order.customerName}</td>
                      <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                      <td className="px-3 py-2 border-b">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-3 py-2 border-b">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      No recent orders yet.
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

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return `₨ ${Number(value).toLocaleString()}`;
}
