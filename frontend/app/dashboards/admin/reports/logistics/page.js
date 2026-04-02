"use client";

import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function LogisticsReportPage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey="logistics" basePath="/dashboards/admin/reports" />
    </AdminShell>
  );
}
