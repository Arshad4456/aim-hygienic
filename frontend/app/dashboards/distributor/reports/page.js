"use client";

import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import ReportsCommandCenter from "../../../../src/modules/reports/ReportsCommandCenter";

export default function DistributorReportsPage() {
  return (
    <UserDashboardShell
      title="Distributor Reports"
      subtitle="Territory-focused revenue, team, customer, and recovery reporting."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <ReportsCommandCenter basePath="/dashboards/distributor/reports" isDistributor />
    </UserDashboardShell>
  );
}