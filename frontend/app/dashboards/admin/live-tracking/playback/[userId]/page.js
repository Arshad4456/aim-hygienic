"use client";

import Link from "next/link";
import AdminShell from "../../../components/AdminShell";
import { RoutePlaybackModule } from "../../../../../../src/modules/liveTracking";

export default function AdminRoutePlaybackPage({ params }) {
  const userId = params?.userId || "";

  return (
    <AdminShell title="Route Playback" user={null}>
      <div className="space-y-3">
        <Link href="/dashboards/admin/live-tracking" className="text-sm text-emerald-700 hover:underline">
          ← Back to live tracking
        </Link>
        <RoutePlaybackModule userId={userId} />
      </div>
    </AdminShell>
  );
}