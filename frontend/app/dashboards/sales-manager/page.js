"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SalesManagerShell from "./components/SalesManagerShell";
import { apiFetch } from "../../lib/api";

const SALES_MANAGER_ROLES = new Set(["sales", "sales_manager", "sales-manager"]);

export default function SalesManagerDashboardPage() {
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
    if (role === "admin") {
      router.replace("/dashboards/admin");
      return;
    }
    if (role && !SALES_MANAGER_ROLES.has(role)) {
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
    const interval = setInterval(loadOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  const highlights = useMemo(
    () => [
      {
        title: "Sales Orders",
        value: formatNumber(overview?.kpis?.salesOrders),
        sub: `${formatNumber(overview?.kpis?.salesQuantity)} units sold`,
      },
      {
        title: "Total Revenue",
        value: formatCurrency(overview?.kpis?.totalRevenue),
        sub: `${formatNumber(overview?.kpis?.dispatchedOrders)} dispatched`,
      },
      {
        title: "Active Customers",
        value: formatNumber(overview?.modules?.salesOrders),
        sub: "Accounts with orders",
      },
      {
        title: "Returns Queue",
        value: formatNumber(overview?.modules?.returns),
        sub: "Awaiting resolution",
      },
    ],
    [overview],
  );

  const quickLinks = [
    {
      title: "Create Sales Order",
      description: "Start a new distributor or retail order.",
      href: "/dashboards/admin/order-management/sales-orders",
    },
    {
      title: "Review Dispatches",
      description: "Track orders ready for dispatch.",
      href: "/dashboards/admin/order-management/dispatch",
    },
    {
      title: "Pipeline Reports",
      description: "Open weekly sales pipeline insights.",
      href: "/dashboards/admin/reports",
    },
  ];

  return (
    <SalesManagerShell user={user} title="Sales Manager Dashboard">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-zinc-500">Good day</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {user?.fullName || "Sales Manager"}
          </div>
          <div className="mt-2 text-sm text-zinc-500">
            Track sales momentum, order fulfillment, and customer activity.
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">{item.title}</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900">{item.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Sales Activity</div>
                <div className="text-sm text-zinc-500">Latest order, expense, and inventory signals.</div>
              </div>
              <div className="text-xs text-emerald-600">Auto-refreshing</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-semibold text-zinc-900">Recent Orders</div>
                <div className="mt-2 space-y-2 text-xs text-zinc-500">
                  {overview?.recent?.movements?.length ? (
                    overview.recent.movements.slice(0, 3).map((movement) => (
                      <div key={movement._id} className="flex items-center justify-between">
                        <span>{movement.productName || movement.productId}</span>
                        <span className="font-medium text-zinc-700">{movement.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <div>No recent orders.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-semibold text-zinc-900">Pending Expenses</div>
                <div className="mt-2 space-y-2 text-xs text-zinc-500">
                  {overview?.recent?.expenses?.length ? (
                    overview.recent.expenses.slice(0, 3).map((expense) => (
                      <div key={expense._id} className="flex items-center justify-between">
                        <span>{expense.title || expense.category}</span>
                        <span className="font-medium text-zinc-700">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div>No pending expenses.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Quick Links</div>
            <div className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="block rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:border-emerald-300 hover:bg-white"
                >
                  <div className="text-sm font-semibold text-zinc-900">{link.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">{link.description}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SalesManagerShell>
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
