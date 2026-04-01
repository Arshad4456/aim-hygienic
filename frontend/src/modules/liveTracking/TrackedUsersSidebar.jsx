"use client";

import Link from "next/link";
import { deriveTrackingStatus, formatDateTime, formatRelativeTime, roleTone, statusTone } from "./utils";

export default function TrackedUsersSidebar({ users, selectedUserId, onSelect, playbackBasePath }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-900">Tracked roster</div>
          <div className="text-sm text-zinc-500">Select a user to focus the live map and details panel.</div>
        </div>
        <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">{users.length} users</div>
      </div>

      <div className="mt-4 max-h-[820px] space-y-3 overflow-y-auto pr-1">
        {users.map((user, index) => {
          const active = String(user.userId || "") === String(selectedUserId || "");
          const status = deriveTrackingStatus(user.lastSeenAt);
          const tone = statusTone(status);
          const territoryLine = [user.regionName, user.zoneName, user.territoryName, user.fieldName].filter(Boolean).join(" • ");

          return (
            <button
              key={`${user.userId}-${user.lastSeenAt || ""}`}
              type="button"
              className={`w-full rounded-2xl border p-4 text-left transition ${
                active ? "border-emerald-300 bg-emerald-50/70 shadow-sm" : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
              onClick={() => onSelect(user.userId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white">
                      {(user.fullName || "U").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-900">{user.fullName || user.userId || "Unknown user"}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${roleTone(user.role)}`}>{user.role || "—"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}>{tone.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-400">#{index + 1}</div>
              </div>

              <div className="mt-3 grid gap-1 text-xs text-zinc-600">
                <div className="truncate">{territoryLine || "Territory metadata not attached"}</div>
                <div>{formatRelativeTime(user.lastSeenAt)}</div>
                <div className="text-zinc-500">Last seen: {formatDateTime(user.lastSeenAt)}</div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  <span>{user.companyId || "No company id"}</span>
                </div>
                <Link
                  href={`${playbackBasePath}/${encodeURIComponent(user.userId)}`}
                  className="text-xs font-medium text-sky-700 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open playback
                </Link>
              </div>
            </button>
          );
        })}

        {!users.length ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
            No tracked users found for the selected filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
