"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
        tone: "emerald",
      },
      {
        title: "Inventory On Hand",
        value: formatNumber(overview?.kpis?.inventoryOnHand),
        sub: "Net movements",
        tone: "blue",
      },
      {
        title: "Total Expenses",
        value: formatCurrency(overview?.kpis?.expenseTotal),
        sub: `Pending: ${formatNumber(overview?.kpis?.pendingExpenses)}`,
        tone: "amber",
      },
      {
        title: "Active Users",
        value: formatNumber(overview?.kpis?.activeUsers),
        sub: "Currently active",
        tone: "violet",
      },
    ];
  }, [overview]);

  const chartData = useMemo(() => {
    const fallbackSeries = [
      { label: "Mon", value: 0 },
      { label: "Tue", value: 0 },
      { label: "Wed", value: 0 },
      { label: "Thu", value: 0 },
      { label: "Fri", value: 0 },
      { label: "Sat", value: 0 },
      { label: "Sun", value: 0 },
    ];

    return {
      salesTrend: overview?.charts?.salesTrend?.length
        ? overview.charts.salesTrend
        : fallbackSeries,
      inventoryFlow: overview?.charts?.inventoryFlow?.length
        ? overview.charts.inventoryFlow
        : fallbackSeries.map((item) => ({ ...item, inbound: 0, outbound: 0 })),
    };
  }, [overview]);

  const quickActions = [
    {
      title: "Create Sales Order",
      description: "Capture distributor and retail orders.",
      href: "/dashboards/admin/order-management/sales-orders",
    },
    {
      title: "Add Inventory Receipt",
      description: "Log inbound stock and GRN updates.",
      href: "/dashboards/admin/procurement/grn",
    },
    {
      title: "Add Expense",
      description: "Submit operational expenses for approval.",
      href: "/dashboards/admin/expense/add",
    },
    {
      title: "Add New User",
      description: "Onboard staff and assign roles.",
      href: "/dashboards/admin/users/add",
    },
  ];

  const actionItems = useMemo(
    () => [
      {
        title: "Review pending expense approvals",
        detail: `${formatNumber(overview?.kpis?.pendingExpenses)} pending approvals`,
        href: "/dashboards/admin/expense",
      },
      {
        title: "Verify latest inventory movements",
        detail: `${formatNumber(overview?.recent?.movements?.length || 0)} movements logged`,
        href: "/dashboards/admin/inventory/ledger",
      },
      {
        title: "Follow up stock transfers",
        detail: `${formatNumber(overview?.recent?.transfers?.length || 0)} transfers awaiting updates`,
        href: "/dashboards/admin/inventory/transfers",
      },
      {
        title: "Track sales order pipeline",
        detail: `${formatNumber(overview?.kpis?.salesOrders)} orders captured`,
        href: "/dashboards/admin/order-management/sales-orders",
      },
    ],
    [overview],
  );

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
              <div className="mt-3">
                <MiniSparkline tone={k.tone} />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">Quick Actions</div>
              <div className="text-sm text-zinc-500">Start the most common admin workflows.</div>
            </div>
            <div className="text-xs text-zinc-500">Admin ready checklist</div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:border-emerald-300 hover:bg-white"
              >
                <div className="text-sm font-semibold text-zinc-900 group-hover:text-emerald-700">
                  {action.title}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{action.description}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-5 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Weekly Sales Trend</div>
                <div className="text-sm text-zinc-500">Orders captured across regions.</div>
              </div>
              <div className="text-xs text-emerald-600">Updated live</div>
            </div>
            <div className="mt-4">
              <BarChart data={chartData.salesTrend} colorClass="bg-emerald-500" />
            </div>
          </div>

          <div className="rounded-2xl bg-white border shadow-sm p-5">
            <div className="text-lg font-semibold text-zinc-900">Action Center</div>
            <div className="text-sm text-zinc-500">Prioritize what needs attention today.</div>
            <div className="mt-4 space-y-3">
              {actionItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block rounded-xl border border-zinc-200 px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{item.detail}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border shadow-sm p-5 xl:col-span-2">
            <div className="text-lg font-semibold text-zinc-900 mb-4">Inventory Flow (Inbound vs Outbound)</div>
            <div className="mb-4">
              <StackedBarChart data={chartData.inventoryFlow} />
            </div>
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
                        ₨ {formatNumber(expense.amount)}
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
  return `₨ ${Number(value).toLocaleString()}`;
}

function MiniSparkline({ tone }) {
  const colors = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
  };
  return (
    <div className="flex items-end gap-1 h-8">
      {[3, 5, 4, 6, 5, 7, 4].map((value, index) => (
        <div
          key={index}
          className={`w-2 rounded-full ${colors[tone] || "bg-zinc-400"}`}
          style={{ height: `${value * 4}px` }}
        />
      ))}
    </div>
  );
}

function BarChart({ data, colorClass }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-12 text-xs text-zinc-500">{item.label}</div>
          <div className="flex-1 h-3 rounded-full bg-zinc-100">
            <div
              className={`h-3 rounded-full ${colorClass}`}
              style={{ width: `${Math.round((item.value / maxValue) * 100)}%` }}
            />
          </div>
          <div className="w-10 text-xs text-zinc-600 text-right">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function StackedBarChart({ data }) {
  const maxValue = Math.max(...data.map((item) => item.inbound + item.outbound), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-12 text-xs text-zinc-500">{item.label}</div>
          <div className="flex-1 flex h-3 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="bg-blue-500"
              style={{ width: `${Math.round((item.inbound / maxValue) * 100)}%` }}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${Math.round((item.outbound / maxValue) * 100)}%` }}
            />
          </div>
          <div className="w-16 text-xs text-zinc-600 text-right">
            {item.inbound}/{item.outbound}
          </div>
        </div>
      ))}
    </div>
  );
}
