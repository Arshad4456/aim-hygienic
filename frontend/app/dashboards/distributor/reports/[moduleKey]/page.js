"use client";

import { useParams } from "next/navigation";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";
import { ReportFocusView } from "../../../components/reports/ReportsWorkspace";

export default function DistributorReportFocusPage() {
  const params = useParams();

  return (
    <UserDashboardShell
      title="Distributor Reports"
      subtitle="Territory-based business visibility across your distributor modules."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards={false}
    >
      <ReportFocusView moduleKey={params?.moduleKey} basePath="/dashboards/distributor/reports" />
    </UserDashboardShell>
  );
}
