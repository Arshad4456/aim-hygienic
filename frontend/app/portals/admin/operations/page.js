"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const fallbackServiceHealth = [
  { title: "Fleet Tracking Coverage", value: 0, note: "0/0 vehicles reporting" },
  { title: "Warehouse Activity", value: 0, note: "0/0 active in last 14 days" },
  { title: "Order Approval Rate", value: 0, note: "0 of 0 orders" },
  { title: "Transfer Completion", value: 0, note: "0/0 transfers closed" },
];

export default function OperationsDashboardPage() {
  const [operations, setOperations] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadOperations() {
      setErr("");
      try {
        const data = await apiFetch("/dashboard/operations");
        setOperations(data);
      } catch (e) {
        setErr(e.message || "Failed to load operations dashboard");
      }
    }
    loadOperations();
    const interval = setInterval(loadOperations, 30000);
    return () => clearInterval(interval);
  }, []);

  const healthStats = useMemo(() => {
    const kpis = operations?.kpis || {};
    return [
      {
        label: "Order Fill Rate",
        value: formatPercent(kpis.orderFillRate),
        sub: `${formatNumber(kpis.dispatchedOrders)} dispatched`,
        tone: "emerald",
      },
      {
        label: "On-Time Dispatch",
        value: formatPercent(kpis.onTimeDispatchRate),
        sub: `${formatNumber(kpis.totalOrders)} total orders`,
        tone: "emerald",
      },
      {
        label: "Cycle Time (hrs)",
        value: formatNumber(kpis.cycleTimeHours),
        sub: `${formatNumber(kpis.completedOrders)} completed`,
        tone: "blue",
      },
      {
        label: "Backlog Orders",
        value: formatNumber(kpis.backlogOrders),
        sub: "Pending approvals",
        tone: "amber",
      },
    ];
  }, [operations]);

  const serviceHealth = operations?.serviceHealth?.length ? operations.serviceHealth : fallbackServiceHealth;
  const alerts = operations?.alerts || [];
  const focusItems = operations?.focusItems || [];
  const pipeline = operations?.pipeline || [];
  const regionalCompletion = operations?.regionalCompletion || [];

  return (
    <AdminShell title="Operations Command Center" user={null}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Operations Command Center</div>
              <div className="text-sm text-zinc-500 mt-1">
                Live snapshot of service levels, logistics readiness, and daily execution.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Updated every 30 minutes</div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {healthStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{stat.label}</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-900">{stat.value}</div>
                <div
                  className={`mt-2 text-xs font-semibold ${
                    stat.tone === "emerald" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Service Health</div>
                <div className="text-sm text-zinc-500">Coverage and utilization by operations.</div>
              </div>
              <div className="text-xs text-zinc-500">Target ≥ 90%</div>
            </div>
            <div className="mt-5 space-y-4">
              {serviceHealth.map((item) => (
                <div key={item.title}>
                  <div className="flex items-center justify-between text-sm text-zinc-700">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-zinc-500">{item.note}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-zinc-100">
                      <div
                        className={`h-2 rounded-full ${item.value >= 90 ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-600 w-12 text-right">{item.value}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Critical Alerts</div>
            <div className="text-sm text-zinc-500">Items needing immediate attention.</div>
            <div className="mt-4 space-y-3">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div key={alert.title} className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-zinc-900">{alert.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          alert.severity === "High"
                            ? "bg-red-100 text-red-700"
                            : alert.severity === "Medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{alert.detail}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-zinc-200 p-3 text-sm text-zinc-500">
                  No critical alerts right now.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Today’s Focus</div>
            <div className="text-sm text-zinc-500">Priority tasks across operations.</div>
            <div className="mt-4 space-y-3">
              {focusItems.length ? (
                focusItems.map((item) => (
                  <div key={item.title} className="rounded-xl border border-zinc-200 p-3">
                    <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {item.owner} • {item.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-zinc-200 p-3 text-sm text-zinc-500">
                  No focus items available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Order Execution Pipeline</div>
                <div className="text-sm text-zinc-500">Live throughput across today’s orders.</div>
              </div>
              <div className="text-xs text-zinc-500">
                Total orders: {formatNumber(operations?.kpis?.totalOrders)}
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {pipeline.length ? (
                pipeline.map((stage) => (
                  <div key={stage.label} className="rounded-xl border bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">{stage.label}</div>
                    <div className="mt-2 text-xl font-semibold text-zinc-900">{formatNumber(stage.value)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-500">
                  Pipeline data will appear once orders are captured.
                </div>
              )}
            </div>
            <div className="mt-6">
              <div className="text-sm font-semibold text-zinc-900">Regional Order Completion</div>
              <div className="text-xs text-zinc-500 mt-1">
                Focus on completion rate for the last 14 days of sales dispatch activity.
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {regionalCompletion.length ? (
                  regionalCompletion.map((row) => (
                    <div key={row.region} className="rounded-xl border border-zinc-200 p-4">
                      <div className="text-sm font-semibold text-zinc-900">{row.region} Region</div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-zinc-100">
                          <div
                            className={`h-2 rounded-full ${row.value >= 85 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${row.value}%` }}
                          />
                        </div>
                        <div className="text-xs text-zinc-600 w-10 text-right">{row.value}%</div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">{formatNumber(row.orders)} orders</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-500">
                    Regional activity data will appear once sales dispatch activity is recorded.
                  </div>
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

function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toFixed(1)}%`;
}