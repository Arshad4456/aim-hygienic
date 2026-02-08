"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../admin/components/AdminShell";
import { apiFetch } from "../../lib/api";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("aim_token");
    const role = localStorage.getItem("aim_role");
    const u = localStorage.getItem("aim_user");

    if (!token) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/login");
      return;
    }
    setUser(u ? JSON.parse(u) : null);
  }, [router]);

  useEffect(() => {
    async function loadOverview() {
      setErr("");
      try {
        const data = await apiFetch("/dashboard/overview");
        setOverview(data);
      } catch (e) {
        setErr(e.message || "Failed to load dashboard");
      }
    }
    loadOverview();
  }, []);

  const kpis = useMemo(() => {
    return [
      {
        title: "Sales Orders",
        value: formatNumber(overview?.kpis?.salesOrders),
        sub: `Units Sold: ${formatNumber(overview?.kpis?.salesQuantity)}`,
      },
      {
        title: "Inventory On Hand",
        value: formatNumber(overview?.kpis?.inventoryOnHand),
        sub: "Net movements",
      },
      {
        title: "Total Expenses",
        value: formatCurrency(overview?.kpis?.expenseTotal),
        sub: `Pending: ${formatNumber(overview?.kpis?.pendingExpenses)}`,
      },
      {
        title: "Active Users",
        value: formatNumber(overview?.kpis?.activeUsers),
        sub: "Currently active",
      },
    ];
  }, [overview]);

  return (
    <AdminShell user={user} title="Admin Dashboard">
      <div className="space-y-5">
        <div className="rounded-2xl bg-white border shadow-sm p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-500">Welcome</div>
            <div className="text-2xl font-semibold text-zinc-900">
              {user?.company || "AIM Hygienic (Pvt) Limited"}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              Logged in as <span className="font-medium text-zinc-800">{user?.fullName || "Admin"}</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold">AH</span>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.title} className="rounded-2xl bg-white border shadow-sm p-4">
              <div className="text-sm text-zinc-500">{k.title}</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">{k.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-5 xl:col-span-2">
            <div className="text-lg font-semibold text-zinc-900 mb-4">Recent Inventory Movements</div>
            <div className="overflow-auto rounded-xl border">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Product</th>
                    <th className="text-left px-3 py-2 border-b">Warehouse</th>
                    <th className="text-left px-3 py-2 border-b">Type</th>
                    <th className="text-left px-3 py-2 border-b">Qty</th>
                    <th className="text-left px-3 py-2 border-b">When</th>
                  </tr>
                </thead>
                <tbody>
                  {overview?.recent?.movements?.length ? (
                    overview.recent.movements.map((row) => (
                      <tr key={row._id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b">{row.productName || row.productId}</td>
                        <td className="px-3 py-2 border-b">{row.warehouseName || row.warehouseId}</td>
                        <td className="px-3 py-2 border-b">{row.movementType}</td>
                        <td className="px-3 py-2 border-b">{formatNumber(row.quantity)}</td>
                        <td className="px-3 py-2 border-b">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                        No recent movements
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white border shadow-sm p-5">
              <div className="text-lg font-semibold text-zinc-900 mb-4">Recent Expenses</div>
              <div className="space-y-3">
                {overview?.recent?.expenses?.length ? (
                  overview.recent.expenses.map((expense) => (
                    <div key={expense._id} className="rounded-xl border px-3 py-2">
                      <div className="text-sm font-semibold text-zinc-900">{expense.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">{expense.category || "Uncategorized"}</div>
                      <div className="text-sm font-semibold text-zinc-900 mt-2">
                        ৳ {formatNumber(expense.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">No recent expenses.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white border shadow-sm p-5">
              <div className="text-lg font-semibold text-zinc-900 mb-4">Stock Transfers</div>
              <div className="space-y-3">
                {overview?.recent?.transfers?.length ? (
                  overview.recent.transfers.map((transfer) => (
                    <div key={transfer._id} className="rounded-xl border px-3 py-2">
                      <div className="text-sm font-semibold text-zinc-900">
                        {transfer.productName || transfer.productId}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {transfer.fromWarehouseName || transfer.fromWarehouseId} →{" "}
                        {transfer.toWarehouseName || transfer.toWarehouseId}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">Status: {transfer.status}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">No recent transfers.</div>
                )}
              </div>
            </div>
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
  return `৳ ${Number(value).toLocaleString()}`;
}