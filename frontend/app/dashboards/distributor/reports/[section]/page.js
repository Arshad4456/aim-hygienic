"use client";

import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";
import ReportDetailPage from "../../../../../src/modules/reports/ReportDetailPage";

export default function DistributorReportDetailPage({ params }) {
  const section = params?.section || "overview";
  return (
    <UserDashboardShell
      title="Distributor Reports"
      subtitle="Territory-focused revenue, team, customer, and recovery reporting."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <ReportDetailPage section={section} basePath="/dashboards/distributor/reports" />
    </UserDashboardShell>
  );
}
