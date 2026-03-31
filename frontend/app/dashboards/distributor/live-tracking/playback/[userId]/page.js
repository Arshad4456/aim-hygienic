"use client";

import Link from "next/link";
import UserDashboardShell from "../../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../../searchItems";
import { RoutePlaybackModule } from "../../../../../../src/modules/liveTracking/RoutePlaybackModule";

export default function DistributorRoutePlaybackPage({ params }) {
  const userId = params?.userId || "";

  return (
    <UserDashboardShell
      title="Distributor Route Playback"
      subtitle="Playback location history for your tracked team members."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <div className="space-y-3">
        <Link href="/dashboards/distributor/live-tracking" className="text-sm text-emerald-700 hover:underline">
          ← Back to live tracking
        </Link>
        <RoutePlaybackModule userId={userId} />
      </div>
    </UserDashboardShell>
  );
}