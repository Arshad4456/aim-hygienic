"use client";

import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function FinanceReportPage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey="finance" basePath="/dashboards/admin/reports" />
    </AdminShell>
  );
}
