"use client";

import LiveTrackingFilters from "./LiveTrackingFilters";
import LiveTrackingMap, { MarkerPopup } from "./LiveTrackingMap";
import TrackedUsersSidebar from "./TrackedUsersSidebar";
import { useLiveTracking } from "./useLiveTracking";

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
  } = useLiveTracking();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-lg font-semibold text-zinc-900">Live tracking module</div>
          <div className="text-sm text-zinc-500">Role-aware live tracked users with map, filters, and playback links.</div>
        </div>
        <button type="button" onClick={reload} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50 w-fit">
          Refresh
        </button>
      </div>

      <LiveTrackingFilters filters={filters} setFilters={setFilters} optionSets={optionSets} />

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <TrackedUsersSidebar
          users={filteredUsers}
          selectedUserId={selectedUserId}
          onSelect={setSelectedUserId}
          playbackBasePath={playbackBasePath}
        />

        <div className="space-y-4">
          <LiveTrackingMap users={filteredUsers} selectedUserId={selectedUserId} onSelect={setSelectedUserId} />
          <MarkerPopup user={selectedUser} />
        </div>
      </div>

      {loading ? <div className="text-sm text-zinc-500">Loading live users…</div> : null}
    </div>
  );
}