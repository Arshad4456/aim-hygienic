"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import SalesShell from "./components/SalesShell";

export default function SalesManagerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("aim_token");
    const role = localStorage.getItem("aim_role");
    const storedUser = localStorage.getItem("aim_user");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (role !== "Sales Manager") {
      router.replace("/login");
      return;
    }
    setUser(storedUser ? JSON.parse(storedUser) : null);
  }, [router]);

  useEffect(() => {
    async function loadOverview() {
      setErr("");
      try {
        const data = await apiFetch("/dashboard/sales-manager");
        setOverview(data);
      } catch (e) {
        setErr(e.message || "Failed to load sales dashboard");
      }
    }
    loadOverview();
  }, []);

  const cards = useMemo(() => {
    return [
      {
        label: "Total Sales Orders",
        value: formatNumber(overview?.orders?.total),
        helper: `${formatNumber(overview?.orders?.byStatus?.pending)} pending approvals`,
      },
      {
        label: "Revenue Captured",
        value: formatCurrency(overview?.orders?.revenue),
        helper: `${formatNumber(overview?.orders?.byStatus?.dispatched)} dispatched`,
      },
      {
        label: "Active Sales Team",
        value: formatNumber(overview?.team?.activeUsers),
        helper: `${formatNumber(overview?.team?.totalUsers)} total users`,
      },
      {
        label: "Products Listed",
        value: formatNumber(overview?.assets?.products),
        helper: `${formatNumber(overview?.assets?.warehouses)} warehouses`,
      },
      {
        label: "Regions Covered",
        value: formatNumber(overview?.assets?.regions),
        helper: "Company scoped coverage",
      },
      {
        label: "Orders Completed",
        value: formatNumber(overview?.orders?.byStatus?.completed),
        helper: `${formatNumber(overview?.orders?.byStatus?.cancelled)} cancelled`,
      },
    ];
  }, [overview]);

  const recentOrders = overview?.recentOrders || [];
  const companyName = overview?.company?.name || user?.companyName || "—";

  return (
    <SalesShell title="Company Sales Dashboard" user={user}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-400">Sales Manager</div>
              <h1 className="text-xl font-semibold text-zinc-900">Company Sales Dashboard</h1>
              <p className="text-sm text-zinc-500">
                Company: <span className="font-medium text-zinc-700">{companyName}</span>
              </p>
            </div>
            <div className="rounded-2xl border bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
              Welcome back, {user?.fullName || "Sales Manager"}
            </div>
          </div>
        </div>

        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-zinc-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900">{card.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{card.helper}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Recent Sales Orders</h2>
              <p className="text-sm text-zinc-500">
                Latest activity for {companyName} sales team.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[680px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Order #</th>
                  <th className="px-3 py-2 text-left border-b">Customer</th>
                  <th className="px-3 py-2 text-left border-b">Status</th>
                  <th className="px-3 py-2 text-left border-b">Total</th>
                  <th className="px-3 py-2 text-left border-b">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                      No sales orders found for this company yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">
                        {order.orderNo}
                      </td>
                      <td className="px-3 py-2 border-b">{order.customerName}</td>
                      <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                      <td className="px-3 py-2 border-b">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-3 py-2 border-b">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SalesShell>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
