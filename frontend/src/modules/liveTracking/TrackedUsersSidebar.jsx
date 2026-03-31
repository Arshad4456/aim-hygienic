"use client";

import Link from "next/link";
import { deriveTrackingStatus, formatDateTime } from "./utils";

export default function TrackedUsersSidebar({ users, selectedUserId, onSelect, playbackBasePath }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-sm font-semibold text-zinc-900">Tracked users ({users.length})</div>
      <div className="mt-3 max-h-[680px] overflow-y-auto space-y-2 pr-1">
        {users.map((user) => {
          const active = String(user.userId || "") === String(selectedUserId || "");
          const status = deriveTrackingStatus(user.lastSeenAt);

          return (
            <button
              key={`${user.userId}-${user.lastSeenAt || ""}`}
              type="button"
              className={`w-full text-left rounded-xl border px-3 py-2 ${active ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}
              onClick={() => onSelect(user.userId)}
            >
              <div className="font-medium text-zinc-900">{user.fullName || user.userId || "Unknown"}</div>
              <div className="text-xs text-zinc-600 mt-0.5">{user.role || "—"} • {status}</div>
              <div className="text-xs text-zinc-500 mt-1">Last seen: {formatDateTime(user.lastSeenAt)}</div>
              <div className="mt-1">
                <Link
                  href={`${playbackBasePath}/${encodeURIComponent(user.userId)}`}
                  className="text-xs text-sky-700 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View route playback
                </Link>
              </div>
            </button>
          );
        })}

        {!users.length ? <div className="text-sm text-zinc-500 py-6 text-center">No tracked users found.</div> : null}
      </div>
    </div>
  );
}