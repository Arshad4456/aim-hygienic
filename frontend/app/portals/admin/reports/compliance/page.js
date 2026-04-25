"use client";

import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function ComplianceReportPage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey="compliance" basePath="/portals/admin/reports" />
    </AdminShell>
  );
}
