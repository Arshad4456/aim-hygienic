"use client";

import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { ReportsDashboardModule } from "../../../../src/modules/reports";

export default function DistributorReportsPage() {
  return (
    <UserDashboardShell
      title="Distributor Reports"
      subtitle="Commercial, collection, and territory reporting designed for distributor operations."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <ReportsDashboardModule variant="distributor" />
    </UserDashboardShell>
  );
}