"use client";

import { useParams } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function AdminReportFocusPage() {
  const params = useParams();

  return (
    <AdminShell title="Reports" user={null}>
      <ReportFocusView moduleKey={params?.moduleKey} basePath="/portals/admin/reports" />
    </AdminShell>
  );
}
