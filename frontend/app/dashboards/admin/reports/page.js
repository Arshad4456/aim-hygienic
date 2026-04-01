"use client";

import AdminShell from "../components/AdminShell";
import ReportsCommandCenter from "../../../../src/modules/reports/ReportsCommandCenter";

export default function ReportsModulePage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportsCommandCenter viewer="management" />
    </AdminShell>
  );
}