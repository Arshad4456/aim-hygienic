"use client";

import AdminShell from "../components/AdminShell";
import { LiveTrackingModule } from "../../../../src/features/live-tracking";

export default function LiveTrackingPage() {
  return (
    <AdminShell title="Live Tracking" user={null}>
      <LiveTrackingModule playbackBasePath="/portals/admin/live-tracking/playback" />
    </AdminShell>
  );
}