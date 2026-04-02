"use client";

import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { ReportsMasterView } from "../../components/reports/ReportsWorkspace";

export default function DistributorReportsPage() {
  return (
    <UserDashboardShell
      title="Distributor Reports"
      subtitle="Territory-based business visibility across your distributor modules."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards={false}
    >
      <ReportsMasterView basePath="/dashboards/distributor/reports" roleLabel="Distributor" />
    </UserDashboardShell>
  );
}
