"use client";
import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function VehicleModuleOverviewPage() {
  const [data, setData] = useState(null);
  useEffect(() => { apiFetch('/vehicle-management/overview').then(setData).catch(() => setData({ kpis: {} })); }, []);
  const k = data?.kpis || {};
  return <AdminShell title="Vehicle Management" user={null}><div className="grid grid-cols-1 md:grid-cols-4 gap-3">{[
    ["Total Vehicles", k.totalVehicles],["Active vs Idle", `${k.activeVehicles||0} / ${k.idleVehicles||0}`],["Trips (MTD)", k.totalTrips],["Total KM", k.totalKm],["Company KM",k.companyKm],["Personal KM",k.personalKm],["Fuel Liters",k.totalFuel],["Fuel Cost",k.fuelCost],["Avg KM/L",Number(k.avgEfficiency||0).toFixed(2)],["Maintenance Cost",k.maintenanceCost],["Due Maintenance",k.dueMaintenanceCount],
  ].map(([label,value])=><div key={label} className="rounded-2xl bg-white border p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-xl font-semibold mt-1">{value ?? 0}</div></div>)}</div></AdminShell>;
}
