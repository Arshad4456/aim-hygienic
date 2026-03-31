"use client";

import AdminShell from "../components/AdminShell";
import { LiveTrackingModule } from "../../../../src/modules/liveTracking";

export default function LiveTrackingPage() {
  return (
    <AdminShell title="Live Tracking" user={null}>
      <LiveTrackingModule playbackBasePath="/dashboards/admin/live-tracking/playback" />
    </AdminShell>
  );
}