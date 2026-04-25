"use client";

import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { LiveTrackingModule } from "../../../../src/features/live-tracking";

export default function DistributorLiveTrackingPage() {
  return (
    <UserDashboardShell
      title="Distributor Live Tracking"
      subtitle="Track related salesmen and orderbookers in real-time."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <LiveTrackingModule playbackBasePath="/portals/distributor/live-tracking/playback" />
    </UserDashboardShell>
  );
}