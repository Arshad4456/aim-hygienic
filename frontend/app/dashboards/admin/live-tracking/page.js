"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function LiveTrackingPage() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [summaryData, usersData, vehiclesData, dispatchesData] = await Promise.all([
          apiFetch("/live-tracking/summary"),
          apiFetch("/live-tracking/users"),
          apiFetch("/live-tracking/vehicles"),
          apiFetch("/live-tracking/dispatches"),
        ]);
        setSummary(summaryData.summary || null);
        setUsers(usersData.users || []);
        setVehicles(vehiclesData.vehicles || []);
        setDispatches(dispatchesData.dispatches || []);
      } catch (e) {
        setErr(e.message || "Failed to load live tracking data");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    return [
      { label: "Total Users", value: formatNumber(summary?.totalUsers) },
      { label: "Active Users", value: formatNumber(summary?.activeUsers) },
      { label: "Tracked Users", value: formatNumber(summary?.trackedUsers) },
      { label: "Live Coordinates", value: formatNumber(users.length) },
      { label: "Fleet Vehicles", value: formatNumber(summary?.totalVehicles) },
      { label: "Tracked Vehicles", value: formatNumber(summary?.trackedVehicles) },
      { label: "Active Dispatches", value: formatNumber(summary?.activeDispatches) },
    ];
  }, [summary, users.length]);

  return (
    <AdminShell title="User Live Tracking" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Live Tracking Command Center</div>
        <div className="text-sm text-zinc-500 mt-1">
          Monitor delivery teams and vehicle GPS updates with auto-refresh every 30 seconds.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
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

        <div className="mt-6 space-y-6">
          <div>
            <div className="text-lg font-semibold text-zinc-900">Field Team GPS</div>
            <div className="text-sm text-zinc-500">Sales reps, dispatch riders, and warehouse runners.</div>
            <div className="mt-3 overflow-auto rounded-xl border">
              <table className="min-w-[880px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">User</th>
                    <th className="text-left px-3 py-2 border-b">Role</th>
                    <th className="text-left px-3 py-2 border-b">Region</th>
                    <th className="text-left px-3 py-2 border-b">Zone</th>
                    <th className="text-left px-3 py-2 border-b">Area</th>
                    <th className="text-left px-3 py-2 border-b">Latitude</th>
                    <th className="text-left px-3 py-2 border-b">Longitude</th>
                    <th className="text-left px-3 py-2 border-b">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                        No live coordinates available
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b">
                          <div className="font-medium text-zinc-900">{user.fullName}</div>
                          <div className="text-xs text-zinc-500">{user.mobile || "—"}</div>
                        </td>
                        <td className="px-3 py-2 border-b">{user.role || "—"}</td>
                        <td className="px-3 py-2 border-b">{user.regionName || "—"}</td>
                        <td className="px-3 py-2 border-b">{user.zoneName || "—"}</td>
                        <td className="px-3 py-2 border-b">{user.areaName || "—"}</td>
                        <td className="px-3 py-2 border-b">{formatCoordinate(user.gpsLatitude)}</td>
                        <td className="px-3 py-2 border-b">{formatCoordinate(user.gpsLongitude)}</td>
                        <td className="px-3 py-2 border-b">
                          {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="text-lg font-semibold text-zinc-900">Vehicle GPS Tracking</div>
            <div className="text-sm text-zinc-500">Active fleet coordinates and latest GPS ping.</div>
            <div className="mt-3 overflow-auto rounded-xl border">
              <table className="min-w-[840px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Vehicle</th>
                    <th className="text-left px-3 py-2 border-b">Driver</th>
                    <th className="text-left px-3 py-2 border-b">Latitude</th>
                    <th className="text-left px-3 py-2 border-b">Longitude</th>
                    <th className="text-left px-3 py-2 border-b">Last GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                        No vehicle GPS updates available
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((vehicle) => (
                      <tr key={vehicle._id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b">
                          <div className="font-medium text-zinc-900">{vehicle.name || vehicle.vehicleId}</div>
                          <div className="text-xs text-zinc-500">{vehicle.plateNumber || "—"}</div>
                        </td>
                        <td className="px-3 py-2 border-b">{vehicle.driverName || "—"}</td>
                        <td className="px-3 py-2 border-b">{formatCoordinate(vehicle.gpsLatitude)}</td>
                        <td className="px-3 py-2 border-b">{formatCoordinate(vehicle.gpsLongitude)}</td>
                        <td className="px-3 py-2 border-b">
                          {vehicle.lastReportedAt
                            ? new Date(vehicle.lastReportedAt).toLocaleString()
                            : vehicle.updatedAt
                              ? new Date(vehicle.updatedAt).toLocaleString()
                              : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="text-lg font-semibold text-zinc-900">Active Dispatch Tracking</div>
            <div className="text-sm text-zinc-500">Orders on the move with assigned driver and vehicle GPS.</div>
            <div className="mt-3 overflow-auto rounded-xl border">
              <table className="min-w-[920px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Order</th>
                    <th className="text-left px-3 py-2 border-b">Customer</th>
                    <th className="text-left px-3 py-2 border-b">Driver</th>
                    <th className="text-left px-3 py-2 border-b">Vehicle</th>
                    <th className="text-left px-3 py-2 border-b">Tracking ID</th>
                    <th className="text-left px-3 py-2 border-b">Vehicle GPS</th>
                    <th className="text-left px-3 py-2 border-b">Dispatched At</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                        No dispatched orders currently tracked
                      </td>
                    </tr>
                  ) : (
                    dispatches.map((dispatch) => (
                      <tr key={dispatch._id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b font-medium text-zinc-900">{dispatch.orderNo}</td>
                        <td className="px-3 py-2 border-b">{dispatch.customerName}</td>
                        <td className="px-3 py-2 border-b">{dispatch.dispatchDriverName || "—"}</td>
                        <td className="px-3 py-2 border-b">{dispatch.dispatchVehicleName || "—"}</td>
                        <td className="px-3 py-2 border-b">{dispatch.dispatchTracking || "—"}</td>
                        <td className="px-3 py-2 border-b">
                          {dispatch.vehicle
                            ? `${formatCoordinate(dispatch.vehicle.gpsLatitude)}, ${formatCoordinate(
                                dispatch.vehicle.gpsLongitude,
                              )}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 border-b">
                          {dispatch.dispatchedAt ? new Date(dispatch.dispatchedAt).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

function formatCoordinate(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(5);
}
