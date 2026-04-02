"use client";

import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function AdminReportFocusPage({ params }) {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey={params?.moduleKey} basePath="/dashboards/admin/reports" />
    </AdminShell>
  );
}
