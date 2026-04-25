"use client";

import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function SalesReportPage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey="sales" basePath="/portals/admin/reports" />
    </AdminShell>
  );
}
