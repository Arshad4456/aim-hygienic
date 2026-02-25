"use client";

import { useEffect, useMemo, useState } from "react";
import { ToastStack, useToastStack } from "./components/ToastStick";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const PAGE_SIZE = 20;

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

function paginateRows(rows = [], page = 1) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { page: safePage, totalPages, rows: rows.slice(start, start + PAGE_SIZE) };
}

export default function VehicleModuleOverviewPage() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { toasts, addToast, closeToast } = useToastStack();

  const [fuelPage, setFuelPage] = useState(1);
  const [efficiencyPage, setEfficiencyPage] = useState(1);
  const [personalPage, setPersonalPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);

  async function loadOverview(silent = false, overrides = {}) {
    if (!silent) setRefreshing(true);
    try {
      const from = overrides.from ?? fromDate;
      const to = overrides.to ?? toDate;
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      const result = await apiFetch(`/vehicle-management/overview${query.toString() ? `?${query.toString()}` : ""}`);
      setData(result);
    } catch (e) {
      addToast(e.message || "Failed to load overview", "error");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOverview();

    const interval = setInterval(() => loadOverview(true), 30000);
    const onFocus = () => loadOverview(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadOverview(true);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fromDate, toDate]);

  const k = data?.kpis || {};
  const b = data?.breakdowns || {};
  const insights = data?.insights || {};
  const alerts = data?.alerts || [];

  useEffect(() => {
    setFuelPage(1);
    setEfficiencyPage(1);
    setPersonalPage(1);
    setAlertsPage(1);
  }, [insights.topFuelVehicles?.length, insights.lowEfficiencyVehicles?.length, insights.topPersonalUsageVehicles?.length, alerts.length]);

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

  const avgFuelCostPerLiter = useMemo(() => {
    const liters = Number(k.totalFuel || 0);
    if (!liters) return 0;
    return Number(k.fuelCost || 0) / liters;
  }, [k.totalFuel, k.fuelCost]);

  const maintenanceEntries = useMemo(() => {
    return b.maintenanceByType?.reduce((sum, row) => sum + Number(row.count || 0), 0) || 0;
  }, [b.maintenanceByType]);

  const avgMaintenanceCost = useMemo(() => {
    if (!maintenanceEntries) return 0;
    return Number(k.maintenanceCost || 0) / maintenanceEntries;
  }, [k.maintenanceCost, maintenanceEntries]);

  const fuelRows = (insights.topFuelVehicles || []).map((v) => [v.registrationNo, v.assignedUserName, Number(v.refuelLiters || 0).toFixed(1), Number(v.refuelCost || 0).toLocaleString()]);
  const efficiencyRows = (insights.lowEfficiencyVehicles || []).map((v) => [v.registrationNo, Number(v.distance || 0).toFixed(0), Number(v.refuelLiters || 0).toFixed(1), Number(v.efficiency || 0).toFixed(2)]);
  const personalRows = (insights.topPersonalUsageVehicles || []).map((v) => [v.registrationNo, Number(v.personalKm || 0).toFixed(0), Number(v.distance || 0).toFixed(0), `${Number(v.personalRatio || 0).toFixed(1)}%`]);

  const fuelPageData = paginateRows(fuelRows, fuelPage);
  const efficiencyPageData = paginateRows(efficiencyRows, efficiencyPage);
  const personalPageData = paginateRows(personalRows, personalPage);
  const alertsPageData = paginateRows(alerts, alertsPage);

  return (
    <AdminShell title="Vehicle Management" user={null}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm" />
          </div>
        </div>
        <button type="button" onClick={() => loadOverview()} disabled={refreshing} className="rounded-lg border px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-60">
          {refreshing ? "Refreshing..." : "Refresh Overview"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <NumberCard title="Total Vehicles" value={k.totalVehicles || 0} subtitle={`${k.activeVehicles || 0} active · ${k.idleVehicles || 0} idle · utilization ${utilization.toFixed(1)}%`} tone="emerald" />
        <NumberCard title="Company Trips (MTD)" value={`${k.companyTrips || 0} trips`} subtitle={`${Number(k.companyKm || 0).toFixed(0)} KM company distance`} tone="emerald" />
        <NumberCard title="Personal Trips (MTD)" value={`${k.personalTrips || 0} trips`} subtitle={`${Number(k.personalKm || 0).toFixed(0)} KM personal distance`} tone="rose" />
        <NumberCard title="Fuel Analysis (MTD)" value={`${Number(k.totalFuel || 0).toFixed(1)} L`} subtitle={`Cost ${Number(k.fuelCost || 0).toLocaleString()} · ${Number(k.totalKm || 0).toFixed(0)} KM · ${avgFuelCostPerLiter.toFixed(2)} per L · ${Number(k.avgEfficiency || 0).toFixed(2)} KM/L`} tone="amber" />
        <NumberCard title="Maintenance Health (MTD)" value={Number(k.maintenanceCost || 0).toLocaleString()} subtitle={`${maintenanceEntries} jobs · avg ${avgMaintenanceCost.toFixed(0)} per job · ${k.dueMaintenanceCount || 0} vehicles under maintenance`} tone={Number(k.dueMaintenanceCount || 0) > 0 ? "rose" : "zinc"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
        <Panel title="Vehicles by Type" rows={toRows(b.byType)} />
        <Panel title="Vehicles by Status" rows={toRows(b.byStatus)} />
        <Panel title="Vehicles by Region" rows={toRows(b.byRegion)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <TablePanel title="Top 10 Vehicles by Fuel Consumption" columns={["Vehicle", "Assigned User", "Fuel (L)", "Fuel Cost"]} rows={fuelPageData.rows} page={fuelPageData.page} totalPages={fuelPageData.totalPages} onFirst={() => setFuelPage(1)} onPrev={() => setFuelPage((p) => Math.max(1, p - 1))} onNext={() => setFuelPage((p) => Math.min(fuelPageData.totalPages, p + 1))} onEnd={() => setFuelPage(fuelPageData.totalPages)} />
        <TablePanel title="Top 10 Lowest Efficiency Vehicles" columns={["Vehicle", "KM", "Fuel (L)", "KM/L"]} rows={efficiencyPageData.rows} page={efficiencyPageData.page} totalPages={efficiencyPageData.totalPages} onFirst={() => setEfficiencyPage(1)} onPrev={() => setEfficiencyPage((p) => Math.max(1, p - 1))} onNext={() => setEfficiencyPage((p) => Math.min(efficiencyPageData.totalPages, p + 1))} onEnd={() => setEfficiencyPage(efficiencyPageData.totalPages)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
        <TablePanel title="Top 10 Personal Usage Vehicles" columns={["Vehicle", "Personal KM", "Total KM", "Personal Ratio"]} rows={personalPageData.rows} page={personalPageData.page} totalPages={personalPageData.totalPages} onFirst={() => setPersonalPage(1)} onPrev={() => setPersonalPage((p) => Math.max(1, p - 1))} onNext={() => setPersonalPage((p) => Math.min(personalPageData.totalPages, p + 1))} onEnd={() => setPersonalPage(personalPageData.totalPages)} />
        <Panel title="Policy Insights" rows={[{ label: "Personal KM ratio", value: `${personalRatio.toFixed(1)}%` }, { label: "Maintenance entries", value: b.maintenanceByType?.reduce((a, x) => a + (x.count || 0), 0) || 0 }, { label: "Fuel trend points", value: b.fuelTrendByDay?.length || 0 }, { label: "Maintenance trend points", value: b.maintenanceTrendByDay?.length || 0 }]} />
      </div>

      <div className="rounded-2xl border bg-white p-4 mt-3">
        <div className="font-semibold">Fraud / Anomaly Alerts</div>
        <div className="text-sm text-zinc-500 mt-1">Sudden jumps, missing proofs, high personal usage, and low fuel efficiency flags.</div>
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? <div className="text-sm text-emerald-700">No alerts in selected range.</div> : alertsPageData.rows.map((a, i) => (
            <div key={`${a.type}-${i}-${alertsPageData.page}`} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium uppercase text-xs">{a.type.replaceAll("_", " ")}</span>
                {a.severity ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase">{a.severity}</span> : null}
              </div>
              <div className="mt-1">{a.message}</div>
              {a.vehicleLabel ? <div className="mt-1 text-xs text-rose-800"><span className="font-medium">Vehicle:</span> {a.vehicleLabel}</div> : null}
              {a.details && Object.keys(a.details).length > 0 ? (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-rose-900">
                  {Object.entries(a.details).map(([label, value]) => (
                    <div key={label} className="rounded bg-white/60 px-2 py-1"><span className="font-medium">{label.replaceAll("_", " ")}:</span> {String(value)}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <Pager page={alertsPageData.page} totalPages={alertsPageData.totalPages} onFirst={() => setAlertsPage(1)} onPrev={() => setAlertsPage((p) => Math.max(1, p - 1))} onNext={() => setAlertsPage((p) => Math.min(alertsPageData.totalPages, p + 1))} onEnd={() => setAlertsPage(alertsPageData.totalPages)} />
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

function TablePanel({ title, columns = [], rows = [], page, totalPages, onFirst, onPrev, onNext, onEnd }) {
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
      <Pager page={page} totalPages={totalPages} onFirst={onFirst} onPrev={onPrev} onNext={onNext} onEnd={onEnd} />
    </div>
  );
}

function Pager({ page = 1, totalPages = 1, onFirst, onPrev, onNext, onEnd }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
      <span className="text-xs text-zinc-500 mr-1">Page {page} of {totalPages}</span>
      <button type="button" onClick={onFirst} disabled={page <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Start</button>
      <button type="button" onClick={onPrev} disabled={page <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Previous</button>
      <button type="button" onClick={onNext} disabled={page >= totalPages} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Next</button>
      <button type="button" onClick={onEnd} disabled={page >= totalPages} className="rounded border px-2 py-1 text-xs disabled:opacity-50">End</button>
    </div>
  );
}