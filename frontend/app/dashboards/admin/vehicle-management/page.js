"use client";

import { useEffect, useMemo, useState } from "react";
import { ToastStack, useToastStack } from "./components/ToastStack";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

function NumberCard({ title, value, subtitle, tone = "zinc" }) {
  const toneClass = tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : tone === "rose" ? "border-rose-200 bg-rose-50" : "border-zinc-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="text-2xl font-semibold mt-1 text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-600 mt-1">{subtitle}</div>
    </div>
  );
}

function toRows(objectMap = {}) {
  return Object.entries(objectMap).map(([label, value]) => ({ label, value }));
}

export default function VehicleModuleOverviewPage() {
  const [data, setData] = useState(null);
  const { toasts, addToast, closeToast } = useToastStack();

  useEffect(() => {
    apiFetch("/vehicle-management/overview")
      .then(setData)
      .catch((e) => addToast(e.message || "Failed to load overview", "error"));
  }, []);

  const k = data?.kpis || {};
  const b = data?.breakdowns || {};
  const insights = data?.insights || {};
  const alerts = data?.alerts || [];

  const personalRatio = useMemo(() => {
    const total = Number(k.totalKm || 0);
    if (!total) return 0;
    return (Number(k.personalKm || 0) / total) * 100;
  }, [k.totalKm, k.personalKm]);

  const utilization = useMemo(() => {
    const total = Number(k.totalVehicles || 0);
    if (!total) return 0;
    return (Number(k.activeVehicles || 0) / total) * 100;
  }, [k.totalVehicles, k.activeVehicles]);

  return (
    <AdminShell title="Vehicle Management" user={null}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <NumberCard
          title="Total Vehicles"
          value={k.totalVehicles || 0}
          subtitle={`${k.activeVehicles || 0} active · ${k.idleVehicles || 0} idle · utilization ${utilization.toFixed(1)}%`}
          tone="emerald"
        />
        <NumberCard
          title="Trips & Distance (MTD)"
          value={`${k.totalTrips || 0} trips`}
          subtitle={`${k.totalKm || 0} KM total · company ${k.companyKm || 0} KM · personal ${k.personalKm || 0} KM`}
        />
        <NumberCard
          title="Fuel Analysis (MTD)"
          value={`${Number(k.totalFuel || 0).toFixed(1)} L`}
          subtitle={`Cost ${Number(k.fuelCost || 0).toLocaleString()} · avg efficiency ${Number(k.avgEfficiency || 0).toFixed(2)} KM/L`}
          tone="amber"
        />
        <NumberCard
          title="Maintenance Health (MTD)"
          value={Number(k.maintenanceCost || 0).toLocaleString()}
          subtitle={`${k.dueMaintenanceCount || 0} vehicles currently under maintenance`}
          tone={Number(k.dueMaintenanceCount || 0) > 0 ? "rose" : "zinc"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
        <Panel title="Vehicles by Type" rows={toRows(b.byType)} />
        <Panel title="Vehicles by Status" rows={toRows(b.byStatus)} />
        <Panel title="Vehicles by Region" rows={toRows(b.byRegion)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <TablePanel
          title="Top 10 Vehicles by Fuel Consumption"
          columns={["Vehicle", "Assigned User", "Fuel (L)", "Fuel Cost"]}
          rows={(insights.topFuelVehicles || []).map((v) => [v.registrationNo, v.assignedUserName, Number(v.refuelLiters || 0).toFixed(1), Number(v.refuelCost || 0).toLocaleString()])}
        />
        <TablePanel
          title="Top 10 Lowest Efficiency Vehicles"
          columns={["Vehicle", "KM", "Fuel (L)", "KM/L"]}
          rows={(insights.lowEfficiencyVehicles || []).map((v) => [v.registrationNo, Number(v.distance || 0).toFixed(0), Number(v.refuelLiters || 0).toFixed(1), Number(v.efficiency || 0).toFixed(2)])}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <TablePanel
          title="Top 10 Personal Usage Vehicles"
          columns={["Vehicle", "Personal KM", "Total KM", "Personal Ratio"]}
          rows={(insights.topPersonalUsageVehicles || []).map((v) => [v.registrationNo, Number(v.personalKm || 0).toFixed(0), Number(v.distance || 0).toFixed(0), `${Number(v.personalRatio || 0).toFixed(1)}%`])}
        />
        <Panel
          title="Policy Insights"
          rows={[
            { label: "Personal KM ratio", value: `${personalRatio.toFixed(1)}%` },
            { label: "Maintenance entries", value: b.maintenanceByType?.reduce((a, x) => a + (x.count || 0), 0) || 0 },
            { label: "Fuel trend points", value: b.fuelTrendByDay?.length || 0 },
            { label: "Maintenance trend points", value: b.maintenanceTrendByDay?.length || 0 },
          ]}
        />
      </div>

      <div className="rounded-2xl border bg-white p-4 mt-3">
        <div className="font-semibold">Fraud / Anomaly Alerts</div>
        <div className="text-sm text-zinc-500 mt-1">Sudden jumps, missing proofs, high personal usage, and low fuel efficiency flags.</div>
        <div className="mt-3 space-y-2 max-h-64 overflow-auto">
          {alerts.length === 0 ? <div className="text-sm text-emerald-700">No alerts in selected range.</div> : alerts.map((a, i) => (
            <div key={`${a.type}-${i}`} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span className="font-medium uppercase text-xs">{a.type.replaceAll("_", " ")}</span> · {a.message}
            </div>
          ))}
        </div>
      </div>
      <ToastStack items={toasts} onClose={closeToast} />
    </AdminShell>
  );
}

function Panel({ title, rows = [] }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-semibold">{title}</div>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <div className="text-sm text-zinc-500">No data</div> : rows.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm border-b pb-1">
            <span className="text-zinc-600">{item.label}</span>
            <span className="font-medium text-zinc-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TablePanel({ title, columns = [], rows = [] }) {
  return (
    <div className="rounded-2xl border bg-white p-4 overflow-auto">
      <div className="font-semibold">{title}</div>
      <table className="w-full text-sm mt-3 min-w-[540px]">
        <thead>
          <tr className="bg-zinc-50 text-left">
            {columns.map((c) => <th key={c} className="px-2 py-2 border">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="px-2 py-3 text-zinc-500 border" colSpan={columns.length}>No data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, idx) => <td key={idx} className="px-2 py-2 border">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
