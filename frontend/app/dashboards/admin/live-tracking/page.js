"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function LiveTrackingPage() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [summaryData, usersData] = await Promise.all([
          apiFetch("/live-tracking/summary"),
          apiFetch("/live-tracking/users"),
        ]);
        setSummary(summaryData.summary || null);
        setUsers(usersData.users || []);
      } catch (e) {
        setErr(e.message || "Failed to load live tracking data");
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    return [
      { label: "Total Users", value: formatNumber(summary?.totalUsers) },
      { label: "Active Users", value: formatNumber(summary?.activeUsers) },
      { label: "Tracked Users", value: formatNumber(summary?.trackedUsers) },
      { label: "Live Coordinates", value: formatNumber(users.length) },
    ];
  }, [summary, users.length]);

  return (
    <AdminShell title="User Live Tracking" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">User Live Tracking</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track field team GPS updates in real time across regions, zones, and areas.
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

        <div className="mt-6 overflow-auto rounded-xl border">
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
