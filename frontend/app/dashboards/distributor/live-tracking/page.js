"use client";

import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import ReportsCommandCenter from "../../../../src/modules/reports/ReportsCommandCenter";

export default function DistributorReportsPage() {
  return (
    <UserDashboardShell
      title="Distributor Reports"
      subtitle="Territory-level performance, recovery, and team intelligence."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <ReportsCommandCenter viewer="distributor" />
    </UserDashboardShell>
  );
}