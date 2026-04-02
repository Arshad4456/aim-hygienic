"use client";

import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function InventoryReportPage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey="inventory" basePath="/dashboards/admin/reports" />
    </AdminShell>
  );
}
