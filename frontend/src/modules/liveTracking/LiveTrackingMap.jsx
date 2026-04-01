"use client";

import {
  buildOpenStreetMapLink,
  buildOsmEmbedUrl,
  deriveTrackingStatus,
  formatCoordinate,
  formatDateTime,
  formatHeading,
  formatRelativeTime,
  formatSpeed,
  roleTone,
  safeNumber,
  statusTone,
} from "./utils";

export default function LiveTrackingMap({ users, selectedUserId, onSelect }) {
  const selectedUser = users.find((user) => String(user.userId || "") === String(selectedUserId || "")) || users[0] || null;
  const lat = safeNumber(selectedUser?.latitude);
  const lng = safeNumber(selectedUser?.longitude);
  const mapUrl = lat !== null && lng !== null ? buildOsmEmbedUrl(lat, lng, 15) : "";
  const externalMapUrl = lat !== null && lng !== null ? buildOpenStreetMapLink(lat, lng) : "";
  const selectedStatus = deriveTrackingStatus(selectedUser?.lastSeenAt);
  const selectedTone = statusTone(selectedStatus);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-base font-semibold text-zinc-900">Live command map</div>
          <div className="mt-1 text-sm text-zinc-500">
            {selectedUser ? `Centered on ${selectedUser.fullName || selectedUser.userId}. Use the roster to focus another tracked user.` : "No live location available yet."}
          </div>
        </div>
        {selectedUser ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${roleTone(selectedUser.role)}`}>{selectedUser.role || "—"}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${selectedTone.badge}`}>{selectedTone.label}</span>
            {externalMapUrl ? (
              <a href={externalMapUrl} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                Open in map
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-50">
        {mapUrl ? (
          <iframe
            title="Live tracking map"
            src={mapUrl}
            className="h-[520px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-[520px] items-center justify-center text-sm text-zinc-500">Waiting for a valid live latitude/longitude from the selected user.</div>
        )}
      </div>

      {users.length ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Quick focus</div>
          <div className="flex flex-wrap gap-2">
            {users.slice(0, 12).map((user) => {
              const status = deriveTrackingStatus(user.lastSeenAt);
              const active = String(selectedUserId || selectedUser?.userId || "") === String(user.userId || "");
              return (
                <button
                  key={`${user.userId}-${user.lastSeenAt || ""}`}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                  onClick={() => onSelect(user.userId)}
                >
                  {user.fullName || user.userId} · {status}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MarkerPopup({ user }) {
  if (!user) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-zinc-500">Select a tracked user to inspect duty details, speed, heading, and territory alignment.</div>
      </div>
    );
  }

  const status = deriveTrackingStatus(user.lastSeenAt);
  const tone = statusTone(status);

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-zinc-900">Live duty details</div>
          <div className="mt-1 text-sm text-zinc-500">Operational details for the selected tracked user.</div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone.badge}`}>{tone.label}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Detail label="Full name" value={user.fullName || "—"} />
        <Detail label="Role" value={user.role || "—"} tone={roleTone(user.role)} pill />
        <Detail label="Last seen" value={formatDateTime(user.lastSeenAt)} helper={formatRelativeTime(user.lastSeenAt)} />
        <Detail label="Latitude" value={formatCoordinate(user.latitude)} />
        <Detail label="Longitude" value={formatCoordinate(user.longitude)} />
        <Detail label="Speed" value={formatSpeed(user.speed)} />
        <Detail label="Heading" value={formatHeading(user.heading)} />
        <Detail label="Region / Zone" value={[user.regionName, user.zoneName].filter(Boolean).join(" • ") || "—"} />
        <Detail label="Territory / Field" value={[user.territoryName, user.fieldName].filter(Boolean).join(" • ") || "—"} />
        <Detail label="Company" value={user.companyId || "—"} />
        <Detail label="Distributor" value={user.distributorId || "—"} />
        <Detail label="Source" value={user.source || "mobile"} />
      </div>
    </div>
  );
}

function Detail({ label, value, helper, pill = false, tone = "" }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      {pill ? <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{value}</div> : <div className="mt-2 text-sm font-medium text-zinc-900">{value}</div>}
      {helper ? <div className="mt-1 text-xs text-zinc-500">{helper}</div> : null}
    </div>
  );
}
