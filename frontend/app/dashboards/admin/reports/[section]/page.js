"use client";

import AdminShell from "../../components/AdminShell";
import ReportDetailPage from "../../../../../src/modules/reports/ReportDetailPage";

export default function AdminReportDetailPage({ params }) {
  const section = params?.section || "overview";
  return (
    <AdminShell title="Reports" user={null}>
      <ReportDetailPage section={section} basePath="/dashboards/admin/reports" />
    </AdminShell>
  );
}