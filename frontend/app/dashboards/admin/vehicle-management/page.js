"use client";

import AdminShell from "../components/AdminShell";
import VehicleOverviewReport from "./components/VehicleOverviewReport";

export default function VehicleModuleOverviewPage() {
  return (
    <AdminShell title="Vehicle Management" user={null}>
      <VehicleOverviewReport />
    </AdminShell>
  );
}
