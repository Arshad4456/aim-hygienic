"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../app/lib/api";
import { buildOsmEmbedUrl, formatDateTime, formatHeading, formatSpeed, safeNumber } from "./utils";

export default function RoutePlaybackModule({ userId }) {
  const params = useParams();
  const effectiveUserId = String(userId || params?.userId || "").trim();
  const [points, setPoints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!effectiveUserId) {
      setPoints([]);
      setError("User ID is missing in the route path.");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/location/history/${encodeURIComponent(effectiveUserId)}`);
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
  }, [effectiveUserId]);

  const latest = useMemo(() => points[0] || null, [points]);
  const mapUrl = useMemo(() => {
    const lat = safeNumber(latest?.latitude);
    const lng = safeNumber(latest?.longitude);
    return lat !== null && lng !== null ? buildOsmEmbedUrl(lat, lng, 15) : "";
  }, [latest]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-lg font-semibold text-zinc-900">Route playback</div>
        <div className="text-sm text-zinc-500">User ID: {effectiveUserId || "—"}</div>
        <div className="text-sm text-zinc-500 mt-1">Total points: {points.length}</div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-2xl border bg-white p-3">
        <div className="text-sm font-semibold text-zinc-900">Latest location preview</div>
        <div className="mt-3 overflow-hidden rounded-xl border bg-zinc-50">
          {mapUrl ? (
            <iframe
              title="Latest route location map"
              src={mapUrl}
              className="h-[420px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-zinc-500">No valid location point found yet.</div>
          )}
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
                <th className="text-left px-3 py-2 border-b">Speed</th>
                <th className="text-left px-3 py-2 border-b">Heading</th>
                <th className="text-left px-3 py-2 border-b">Source</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p._id || `${p.recordedAt}-${p.latitude}-${p.longitude}`}>
                  <td className="px-3 py-2 border-b">{formatDateTime(p.recordedAt)}</td>
                  <td className="px-3 py-2 border-b">{p.latitude ?? "—"}</td>
                  <td className="px-3 py-2 border-b">{p.longitude ?? "—"}</td>
                  <td className="px-3 py-2 border-b">{formatSpeed(p.speed)}</td>
                  <td className="px-3 py-2 border-b">{formatHeading(p.heading)}</td>
                  <td className="px-3 py-2 border-b">{p.source || "—"}</td>
                </tr>
              ))}
              {!points.length && !loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No route points found.</td>
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