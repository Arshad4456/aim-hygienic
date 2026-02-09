"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  {
    title: "Route Planning",
    description: "Design routes by warehouse, zone, and area coverage.",
    href: "/dashboards/admin/logistics/routes",
  },
  {
    title: "Dispatch & Delivery",
    description: "Assign vehicles and drivers to delivery runs.",
    href: "/dashboards/admin/logistics/dispatch",
  },
  {
    title: "Vehicle Assignment",
    description: "Maintain vehicle master and delivery capacity.",
    href: "/dashboards/admin/assets/vehicles",
  },
];

export default function LogisticsModulePage() {
  const [report, setReport] = useState(null);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load({ showLoading } = {}) {
      setErr("");
      if (showLoading) setLoading(true);
      try {
        const [logisticsData, dispatchData] = await Promise.all([
          apiFetch("/reports/logistics"),
          apiFetch("/orders/dispatch"),
        ]);
        setReport(logisticsData || null);
        setDispatchQueue(dispatchData?.orders || []);
      } catch (e) {
        setErr(e.message || "Failed to load logistics data");
      } finally {
        if (showLoading) setLoading(false);
      }
    }
    load({ showLoading: true });
    const interval = setInterval(() => load(), 30000);
    return () => clearInterval(interval);
  }, []);

  const transferSummary = useMemo(() => {
    const base = report?.transferCounts || [];
    return base
      .map((row) => ({
        status: row.status,
        count: Number(row.count || 0),
      }))
      .sort((a, b) => b.count - a.count);
  }, [report]);

  const metrics = useMemo(
    () => [
      { label: "Vehicles Available", value: formatNumber(report?.vehicleCount) },
      {
        label: "Transfers Tracked",
        value: formatNumber(transferSummary.reduce((sum, row) => sum + row.count, 0)),
      },
      {
        label: "Transfers (Top Status)",
        value: transferSummary[0] ? `${transferSummary[0].status} (${transferSummary[0].count})` : "—",
      },
      {
        label: "Dispatch Queue",
        value: formatNumber(dispatchQueue.length),
      },
    ],
    [report, transferSummary, dispatchQueue.length],
  );

  return (
    <AdminShell title="Distribution & Logistics" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Distribution & Logistics</div>
          <div className="text-sm text-zinc-500 mt-1">
            Plan routes, dispatch deliveries, and track fleet utilization.
          </div>
          <div className="text-xs text-emerald-600 mt-1">Auto-refreshing every 30 seconds</div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : loading ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              Loading logistics data...
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{metric.label}</div>
                <div className="text-lg font-semibold text-zinc-900 mt-2">{metric.value}</div>
              </div>
            ))}
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
          <div className="text-lg font-semibold text-zinc-900">Transfer Status Mix</div>
          <div className="text-sm text-zinc-500 mt-1">
            Snapshot of stock transfer statuses across logistics operations.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[560px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Count</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-zinc-500">
                      Loading transfer status...
                    </td>
                  </tr>
                ) : transferSummary.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-zinc-500">
                      No transfer status data available.
                    </td>
                  </tr>
                ) : (
                  transferSummary.map((row) => (
                    <tr key={row.status} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b capitalize">{row.status}</td>
                      <td className="px-3 py-2 border-b">{formatNumber(row.count)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Dispatch Queue</div>
          <div className="text-sm text-zinc-500 mt-1">
            Latest orders approved for dispatch or already in transit.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Order No</th>
                  <th className="text-left px-3 py-2 border-b">Customer</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Expected Delivery</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                      Loading dispatch queue...
                    </td>
                  </tr>
                ) : dispatchQueue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                      No dispatch-ready orders.
                    </td>
                  </tr>
                ) : (
                  dispatchQueue.map((order) => (
                    <tr key={order._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                      <td className="px-3 py-2 border-b">{order.customerName}</td>
                      <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                      <td className="px-3 py-2 border-b">
                        {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
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
