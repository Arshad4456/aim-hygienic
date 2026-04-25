"use client";

import AdminShell from "../components/AdminShell";
import { ReportsMasterView } from "../../components/reports/ReportsWorkspace";

export default function ReportsModulePage() {
  return (
    <AdminShell title="Reports" user={null}>
      <ReportsMasterView basePath="/portals/admin/reports" roleLabel="Admin / Company Admin" />
    </AdminShell>
  );
}
