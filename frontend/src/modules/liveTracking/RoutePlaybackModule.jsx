"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import { formatDateTime, markerPosition } from "./utils";

export default function RoutePlaybackModule({ userId }) {
  const [points, setPoints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/location/history/${encodeURIComponent(userId)}`);
        if (!active) return;
        setPoints(Array.isArray(res?.data?.points) ? res.data.points : []);
      } catch (e) {
        if (!active) return;
        setError(e?.message || "Failed to load route playback");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const latest = useMemo(() => points[0] || null, [points]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold text-zinc-900">Route playback</div>
        <div className="text-sm text-zinc-500">User ID: {userId}</div>
        <div className="text-sm text-zinc-500 mt-1">Total points: {points.length}</div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-2xl border bg-white p-3">
        <div className="text-sm font-semibold text-zinc-900">Latest location preview</div>
        <div className="mt-3 relative h-[420px] overflow-hidden rounded-xl border bg-gradient-to-b from-sky-50 to-emerald-50">
          {latest && markerPosition(latest.latitude, latest.longitude) ? (
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-200"
              style={markerPosition(latest.latitude, latest.longitude)}
            />
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-3">
        <div className="text-sm font-semibold text-zinc-900">History points</div>
        <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Recorded at</th>
                <th className="text-left px-3 py-2 border-b">Latitude</th>
                <th className="text-left px-3 py-2 border-b">Longitude</th>
                <th className="text-left px-3 py-2 border-b">Source</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p._id || `${p.recordedAt}-${p.latitude}-${p.longitude}`}>
                  <td className="px-3 py-2 border-b">{formatDateTime(p.recordedAt)}</td>
                  <td className="px-3 py-2 border-b">{p.latitude ?? "—"}</td>
                  <td className="px-3 py-2 border-b">{p.longitude ?? "—"}</td>
                  <td className="px-3 py-2 border-b">{p.source || "—"}</td>
                </tr>
              ))}
              {!points.length && !loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">No route points found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {loading ? <div className="text-sm text-zinc-500">Loading route history…</div> : null}
    </div>
  );
}