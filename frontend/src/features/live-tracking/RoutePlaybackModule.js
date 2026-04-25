"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../app/lib/api";
import {
  buildOpenStreetMapLink,
  buildOsmEmbedUrl,
  buildPlaybackPreviewPoint,
  computeRouteStats,
  formatCoordinate,
  formatDateTime,
  formatHeading,
  formatSpeed,
  safeNumber,
} from "./utils";

export default function RoutePlaybackModule({ userId }) {
  const params = useParams();
  const effectiveUserId = String(userId || params?.userId || "").trim();
  const [points, setPoints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pointIndex, setPointIndex] = useState(0);

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
        const nextPoints = Array.isArray(res?.data?.points) ? res.data.points : [];
        setPoints(nextPoints);
        setPointIndex(Math.max(0, nextPoints.length - 1));
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

  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime()),
    [points],
  );
  const stats = useMemo(() => computeRouteStats(sortedPoints), [sortedPoints]);
  const previewPoint = useMemo(() => buildPlaybackPreviewPoint(sortedPoints, pointIndex), [sortedPoints, pointIndex]);
  const mapUrl = useMemo(() => {
    const lat = safeNumber(previewPoint?.latitude);
    const lng = safeNumber(previewPoint?.longitude);
    return lat !== null && lng !== null ? buildOsmEmbedUrl(lat, lng, 16) : "";
  }, [previewPoint]);
  const externalMapUrl = useMemo(() => {
    const lat = safeNumber(previewPoint?.latitude);
    const lng = safeNumber(previewPoint?.longitude);
    return lat !== null && lng !== null ? buildOpenStreetMapLink(lat, lng, 17) : "";
  }, [previewPoint]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-900 to-sky-950 p-5 text-white shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">Playback analytics</div>
        <div className="mt-2 text-2xl font-semibold">Route Playback</div>
        <div className="mt-2 text-sm text-zinc-300">Inspect historical location points for a tracked user and scrub the timeline point-by-point.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="User ID" value={effectiveUserId || "—"} compact />
        <StatCard label="Total points" value={String(stats.totalPoints)} />
        <StatCard label="First point" value={formatDateTime(stats.startAt)} />
        <StatCard label="Last point" value={formatDateTime(stats.endAt)} />
        <StatCard label="Average speed" value={stats.avgSpeedKmh === null ? "N/A" : `${stats.avgSpeedKmh.toFixed(1)} km/h`} />
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-zinc-900">Playback map preview</div>
              <div className="mt-1 text-sm text-zinc-500">Use the range slider to focus a single recorded route point.</div>
            </div>
            {externalMapUrl ? (
              <a href={externalMapUrl} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                Open in map
              </a>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-50">
            {mapUrl ? (
              <iframe
                title="Route playback map"
                src={mapUrl}
                className="h-[460px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-[460px] items-center justify-center text-sm text-zinc-500">No valid location point found yet.</div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Timeline scrubber</div>
                <div className="mt-1 text-sm text-zinc-600">Point {sortedPoints.length ? pointIndex + 1 : 0} of {sortedPoints.length}</div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, sortedPoints.length - 1)}
                step={1}
                value={Math.min(pointIndex, Math.max(0, sortedPoints.length - 1))}
                onChange={(e) => setPointIndex(Number(e.target.value || 0))}
                className="w-full md:max-w-[360px]"
                disabled={!sortedPoints.length}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Selected point details</div>
            <div className="mt-4 grid gap-3">
              <PointDetail label="Recorded at" value={formatDateTime(previewPoint?.recordedAt)} />
              <PointDetail label="Latitude" value={formatCoordinate(previewPoint?.latitude)} />
              <PointDetail label="Longitude" value={formatCoordinate(previewPoint?.longitude)} />
              <PointDetail label="Speed" value={formatSpeed(previewPoint?.speed)} />
              <PointDetail label="Heading" value={formatHeading(previewPoint?.heading)} />
              <PointDetail label="Source" value={previewPoint?.source || "—"} />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Route event table</div>
            <div className="mt-3 max-h-[420px] overflow-y-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Recorded at</th>
                    <th className="text-left px-3 py-2 border-b">Latitude</th>
                    <th className="text-left px-3 py-2 border-b">Longitude</th>
                    <th className="text-left px-3 py-2 border-b">Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPoints.map((p, idx) => (
                    <tr key={p._id || `${p.recordedAt}-${p.latitude}-${p.longitude}`} className={idx === pointIndex ? "bg-emerald-50" : "bg-white"}>
                      <td className="px-3 py-2 border-b">{formatDateTime(p.recordedAt)}</td>
                      <td className="px-3 py-2 border-b">{formatCoordinate(p.latitude)}</td>
                      <td className="px-3 py-2 border-b">{formatCoordinate(p.longitude)}</td>
                      <td className="px-3 py-2 border-b">{formatSpeed(p.speed)}</td>
                    </tr>
                  ))}
                  {!sortedPoints.length && !loading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">No route points found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="text-sm text-zinc-500">Loading route history…</div> : null}
    </div>
  );
}

function StatCard({ label, value, compact = false }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 ${compact ? "text-sm break-all" : "text-lg"} font-semibold text-zinc-900`}>{value}</div>
    </div>
  );
}

function PointDetail({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}
