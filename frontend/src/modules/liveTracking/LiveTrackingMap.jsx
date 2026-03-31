"use client";

import { deriveTrackingStatus, formatDateTime, markerPosition } from "./utils";

export default function LiveTrackingMap({ users, selectedUserId, onSelect }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-sm font-semibold text-zinc-900">Live map</div>
      <div className="text-xs text-zinc-500">Marker position is based on latest latitude/longitude.</div>
      <div className="mt-3 relative h-[520px] overflow-hidden rounded-xl border bg-gradient-to-b from-sky-50 to-emerald-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,116,144,0.08),transparent_55%)]" />
        {users.map((user) => {
          const point = markerPosition(user.latitude, user.longitude);
          if (!point) return null;
          const status = deriveTrackingStatus(user.lastSeenAt);
          const active = String(selectedUserId || "") === String(user.userId || "");

          return (
            <button
              key={`${user.userId}-${user.lastSeenAt || ""}`}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={point}
              onClick={() => onSelect(user.userId)}
              title={`${user.fullName || user.userId} (${user.role || ""})`}
            >
              <span
                className={`block h-3.5 w-3.5 rounded-full border-2 ${
                  status === "online"
                    ? "bg-emerald-500 border-emerald-200"
                    : status === "idle"
                      ? "bg-amber-400 border-amber-100"
                      : "bg-zinc-400 border-zinc-200"
                } ${active ? "ring-4 ring-sky-200" : ""}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MarkerPopup({ user }) {
  if (!user) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-500">
        Select a marker or user from the sidebar.
      </div>
    );
  }

  const status = deriveTrackingStatus(user.lastSeenAt);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Marker details</div>
      <div className="mt-3 grid gap-2 text-sm text-zinc-700">
        <div><span className="text-zinc-500">Full name:</span> {user.fullName || "—"}</div>
        <div><span className="text-zinc-500">Role:</span> {user.role || "—"}</div>
        <div><span className="text-zinc-500">Status:</span> {status}</div>
        <div><span className="text-zinc-500">Speed:</span> {user.speed ?? "N/A"}</div>
        <div><span className="text-zinc-500">Heading:</span> {user.heading ?? "N/A"}</div>
        <div><span className="text-zinc-500">Last seen:</span> {formatDateTime(user.lastSeenAt)}</div>
      </div>
    </div>
  );
}
