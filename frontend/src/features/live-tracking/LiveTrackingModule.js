"use client";

import LiveTrackingFilters from "./LiveTrackingFilters";
import LiveTrackingMap, { MarkerPopup } from "./LiveTrackingMap";
import TrackedUsersSidebar from "./TrackedUsersSidebar";
import { useLiveTracking } from "./useLiveTracking";
import { formatDateTime, statusTone } from "./utils";

const KPI_CARDS = [
  { key: "total", label: "Tracked users", helper: "Visible in current filter scope" },
  { key: "online", label: "Online now", helper: "Updated in the last 5 minutes" },
  { key: "idle", label: "Idle", helper: "Older than 5 minutes" },
  { key: "offline", label: "Offline", helper: "No recent location update" },
  { key: "onDuty", label: "On duty", helper: "Online + idle users" },
  { key: "suppliers", label: "Suppliers", helper: "Tracked supplier accounts" },
  { key: "salesmen", label: "Salesmen", helper: "Tracked sales team" },
  { key: "orderBookers", label: "Order bookers", helper: "Tracked booking team" },
];

export default function LiveTrackingModule({ playbackBasePath }) {
  const {
    loading,
    error,
    filters,
    setFilters,
    filteredUsers,
    selectedUser,
    selectedUserId,
    setSelectedUserId,
    optionSets,
    reload,
    summary,
    activityFeed,
    lastLoadedAt,
  } = useLiveTracking();

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Operations monitoring</div>
            <div className="mt-2 text-2xl font-semibold">Live Tracking Command Center</div>
            <div className="mt-2 max-w-3xl text-sm text-zinc-300">
              Monitor supplier, salesman, and order booker movement in one operational workspace with role-aware filters, live focus, and route playback shortcuts.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
              Last refreshed: <span className="font-medium text-white">{formatDateTime(lastLoadedAt)}</span>
            </div>
            <button type="button" onClick={() => reload()} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-50">
              Refresh live view
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {KPI_CARDS.map((card) => {
          const tone = statusTone(card.key === "online" ? "online" : card.key === "idle" ? "idle" : card.key === "offline" ? "offline" : "unknown");
          return (
            <div key={card.key} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</div>
                <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{summary[card.key] ?? 0}</div>
              <div className="mt-1 text-xs text-zinc-500">{card.helper}</div>
            </div>
          );
        })}
      </div>

      <LiveTrackingFilters filters={filters} setFilters={setFilters} optionSets={optionSets} />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-5 2xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <TrackedUsersSidebar
          users={filteredUsers}
          selectedUserId={selectedUserId}
          onSelect={setSelectedUserId}
          playbackBasePath={playbackBasePath}
        />

        <LiveTrackingMap users={filteredUsers} selectedUserId={selectedUserId} onSelect={setSelectedUserId} />

        <div className="space-y-5">
          <MarkerPopup user={selectedUser} />

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Recent activity feed</div>
            <div className="mt-1 text-sm text-zinc-500">Latest sync events visible in your current role and filter scope.</div>
            <div className="mt-4 space-y-3">
              {activityFeed.length ? (
                activityFeed.map((item) => {
                  const tone = statusTone(item.status);
                  return (
                    <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                        <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{item.subtitle}</div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                  No activity yet for the current filter set.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? <div className="text-sm text-zinc-500">Loading live users…</div> : null}
    </div>
  );
}
