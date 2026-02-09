"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function LogisticsRoutesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dispatchQueue, setDispatchQueue] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [warehousesData, regionsData, zonesData, areasData, vehiclesData, dispatchData] =
          await Promise.all([
            apiFetch("/warehouses"),
            apiFetch("/regions"),
            apiFetch("/zones"),
            apiFetch("/areas"),
            apiFetch("/vehicles"),
            apiFetch("/orders/dispatch"),
          ]);
        setWarehouses(warehousesData.warehouses || []);
        setRegions(regionsData.regions || []);
        setZones(zonesData.zones || []);
        setAreas(areasData.areas || []);
        setVehicles(vehiclesData.vehicles || []);
        setDispatchQueue(dispatchData.orders || []);
      } catch (e) {
        setErr(e.message || "Failed to load route planning data");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const fleetStats = useMemo(() => {
    const assignedDrivers = vehicles.filter((vehicle) => vehicle.driverName || vehicle.driverId).length;
    const withCapacity = vehicles.filter((vehicle) => Number(vehicle.deliveryCapacity) > 0).length;
    return {
      total: vehicles.length,
      assignedDrivers,
      withoutDrivers: Math.max(vehicles.length - assignedDrivers, 0),
      withCapacity,
    };
  }, [vehicles]);

  const coverageRows = useMemo(() => {
    return regions.map((region) => {
      const regionZones = zones.filter((zone) => zone.regionId === region.regionId);
      const zoneIds = regionZones.map((zone) => zone.zoneId);
      const regionAreas = areas.filter((area) => zoneIds.includes(area.zoneId));
      return {
        regionName: region.name,
        zones: regionZones.length,
        areas: regionAreas.length,
        updatedAt: region.updatedAt,
      };
    });
  }, [regions, zones, areas]);

  const dispatchPreview = useMemo(() => dispatchQueue.slice(0, 5), [dispatchQueue]);

  const metrics = [
    { label: "Warehouses", value: formatNumber(warehouses.length) },
    { label: "Regions", value: formatNumber(regions.length) },
    { label: "Zones", value: formatNumber(zones.length) },
    { label: "Areas", value: formatNumber(areas.length) },
    { label: "Fleet Vehicles", value: formatNumber(fleetStats.total) },
    { label: "Drivers Assigned", value: formatNumber(fleetStats.assignedDrivers) },
    { label: "Dispatch Queue", value: formatNumber(dispatchQueue.length) },
    { label: "Vehicles With Capacity", value: formatNumber(fleetStats.withCapacity) },
  ];

  return (
    <AdminShell title="Route Planning" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Route Planning Command Center</div>
              <div className="text-sm text-zinc-500 mt-1">
                Build delivery routes by warehouse, region, zone, and area with live fleet readiness.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Auto-refreshing every 30 seconds</div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickLink
              title="Manage Warehouses"
              description="Align supply points and coverage."
              href="/dashboards/admin/warehouses"
            />
            <QuickLink
              title="Region & Zone Setup"
              description="Define delivery boundaries."
              href="/dashboards/admin/regions"
            />
            <QuickLink
              title="Area Coverage"
              description="Maintain area master data."
              href="/dashboards/admin/areas"
            />
            <QuickLink
              title="Fleet Vehicles"
              description="Assign drivers and capacity."
              href="/dashboards/admin/assets/vehicles"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
            <div className="text-lg font-semibold text-zinc-900">Coverage Matrix</div>
            <div className="text-sm text-zinc-500 mt-1">
              Monitor region-to-zone and area coverage for route balancing.
            </div>
            <div className="mt-4 overflow-auto rounded-xl border">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Region</th>
                    <th className="text-left px-3 py-2 border-b">Zones</th>
                    <th className="text-left px-3 py-2 border-b">Areas</th>
                    <th className="text-left px-3 py-2 border-b">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageRows.length ? (
                    coverageRows.map((row) => (
                      <tr key={row.regionName} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.regionName}</td>
                        <td className="px-3 py-2 border-b">{formatNumber(row.zones)}</td>
                        <td className="px-3 py-2 border-b">{formatNumber(row.areas)}</td>
                        <td className="px-3 py-2 border-b">
                          {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                        No region coverage data available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Fleet Readiness</div>
            <div className="text-sm text-zinc-500 mt-1">
              Balance vehicles with driver assignments and delivery capacity.
            </div>
            <div className="mt-4 space-y-3">
              <StatRow label="Total Fleet" value={formatNumber(fleetStats.total)} />
              <StatRow label="Drivers Assigned" value={formatNumber(fleetStats.assignedDrivers)} />
              <StatRow label="Without Drivers" value={formatNumber(fleetStats.withoutDrivers)} />
              <StatRow label="Vehicles With Capacity" value={formatNumber(fleetStats.withCapacity)} />
            </div>
            <div className="mt-6 rounded-xl border border-dashed bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
              Tip: Ensure every dispatch-ready vehicle has a driver and capacity set for accurate route planning.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Dispatch Preview</div>
          <div className="text-sm text-zinc-500 mt-1">
            Orders waiting for route assignment and dispatch scheduling.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Order No</th>
                  <th className="text-left px-3 py-2 border-b">Customer</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Expected Delivery</th>
                </tr>
              </thead>
              <tbody>
                {dispatchPreview.length ? (
                  dispatchPreview.map((order) => (
                    <tr key={order._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                      <td className="px-3 py-2 border-b">{order.customerName}</td>
                      <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                      <td className="px-3 py-2 border-b">
                        {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                      No dispatch-ready orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function QuickLink({ title, description, href }) {
  return (
    <Link href={href} className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="text-xs text-zinc-500 mt-2">{description}</div>
    </Link>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-zinc-50 px-3 py-2 text-sm">
      <span className="text-zinc-600">{label}</span>
      <span className="font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}
