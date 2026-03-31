"use client";

import { buildOsmEmbedUrl, deriveTrackingStatus, formatDateTime, formatHeading, formatSpeed, safeNumber } from "./utils";

export default function LiveTrackingMap({ users, selectedUserId, onSelect }) {
  const selectedUser = users.find((user) => String(user.userId || "") === String(selectedUserId || "")) || users[0] || null;
  const lat = safeNumber(selectedUser?.latitude);
  const lng = safeNumber(selectedUser?.longitude);
  const mapUrl = lat !== null && lng !== null ? buildOsmEmbedUrl(lat, lng, 15) : "";

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-sm font-semibold text-zinc-900">Live map</div>
      <div className="text-xs text-zinc-500">
        {selectedUser ? `Showing latest map position for ${selectedUser.fullName || selectedUser.userId}.` : "No live location available yet."}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border bg-zinc-50">
        {mapUrl ? (
          <iframe
            title="Live tracking map"
            src={mapUrl}
            className="h-[520px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-[520px] items-center justify-center text-sm text-zinc-500">Waiting for a valid live latitude/longitude.</div>
        )}
      </div>

      {users.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {users.slice(0, 12).map((user) => {
            const status = deriveTrackingStatus(user.lastSeenAt);
            const active = String(selectedUserId || selectedUser?.userId || "") === String(user.userId || "");
            return (
              <button
                key={`${user.userId}-${user.lastSeenAt || ""}`}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700"}`}
                onClick={() => onSelect(user.userId)}
              >
                {user.fullName || user.userId} · {status}
              </button>
            );
          })}
        </div>
      ) : null}
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
        <div><span className="text-zinc-500">Latitude:</span> {safeNumber(user.latitude) ?? "N/A"}</div>
        <div><span className="text-zinc-500">Longitude:</span> {safeNumber(user.longitude) ?? "N/A"}</div>
        <div><span className="text-zinc-500">Speed:</span> {formatSpeed(user.speed)}</div>
        <div><span className="text-zinc-500">Heading:</span> {formatHeading(user.heading)}</div>
        <div><span className="text-zinc-500">Last seen:</span> {formatDateTime(user.lastSeenAt)}</div>
      </div>
    </div>
  );
}