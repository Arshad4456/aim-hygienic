"use client";

import AdminShell from "../../components/AdminShell";
import VehicleOverviewReport from "../components/VehicleOverviewReport";

export default function VehicleReportsPage() {
  return (
    <AdminShell title="Vehicle Reports" user={null}>
      <VehicleOverviewReport />
    </AdminShell>
  );
}
