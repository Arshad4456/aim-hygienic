"use client";

import AdminShell from "../components/AdminShell";

const healthStats = [
  { label: "Order Fill Rate", value: "96.2%", delta: "+1.4%", tone: "emerald" },
  { label: "On-Time Dispatch", value: "92.8%", delta: "+0.8%", tone: "emerald" },
  { label: "Cycle Time (hrs)", value: "26.4", delta: "-1.9", tone: "blue" },
  { label: "Backlog Orders", value: "128", delta: "-12", tone: "amber" },
];

const serviceHealth = [
  { title: "North Region Coverage", value: 88, note: "18 routes live" },
  { title: "Central Region Coverage", value: 94, note: "24 routes live" },
  { title: "South Region Coverage", value: 81, note: "12 routes live" },
  { title: "Warehouse Utilization", value: 76, note: "5 facilities active" },
];

const alerts = [
  {
    title: "Top 3 distributors awaiting dispatch",
    detail: "12 orders pending in Lahore hub.",
    severity: "High",
  },
  {
    title: "Low stock risk: Surface Cleaner 5L",
    detail: "Projected stockout in 6 days.",
    severity: "Medium",
  },
  {
    title: "Fleet idle time above target",
    detail: "Average idle time 22 mins in Central region.",
    severity: "Medium",
  },
];

const focusItems = [
  { title: "Validate tomorrow's route plan", owner: "Dispatch Lead", time: "Before 5 PM" },
  { title: "Approve GRN for vendor PAK-409", owner: "Procurement", time: "2 PM" },
  { title: "Review claims batch #CL-227", owner: "Quality Team", time: "4 PM" },
  { title: "Finalize month-end expense sweep", owner: "Finance Ops", time: "EOD" },
];

const pipeline = [
  { label: "Orders Captured", value: 1240 },
  { label: "Orders Approved", value: 1012 },
  { label: "Picking & Packing", value: 744 },
  { label: "Dispatched", value: 692 },
];

export default function OperationsDashboardPage() {
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
                  {stat.delta} vs last week
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
                <div className="text-sm text-zinc-500">Coverage and utilization by region.</div>
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
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-900">{alert.title}</div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        alert.severity === "High"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{alert.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Today’s Focus</div>
            <div className="text-sm text-zinc-500">Priority tasks across operations.</div>
            <div className="mt-4 space-y-3">
              {focusItems.map((item) => (
                <div key={item.title} className="rounded-xl border border-zinc-200 p-3">
                  <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {item.owner} • {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Order Execution Pipeline</div>
                <div className="text-sm text-zinc-500">Live throughput across today’s orders.</div>
              </div>
              <div className="text-xs text-zinc-500">Total orders: 1,240</div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {pipeline.map((stage) => (
                <div key={stage.label} className="rounded-xl border bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">{stage.label}</div>
                  <div className="mt-2 text-xl font-semibold text-zinc-900">{stage.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="text-sm font-semibold text-zinc-900">Regional Order Completion</div>
              <div className="text-xs text-zinc-500 mt-1">
                Focus on completion rate for today’s dispatch windows.
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  { region: "North", value: 91, orders: 420 },
                  { region: "Central", value: 87, orders: 512 },
                  { region: "South", value: 79, orders: 308 },
                ].map((row) => (
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
                    <div className="mt-2 text-xs text-zinc-500">{row.orders} orders</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
