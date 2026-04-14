"use client";

import AdminShell from "../components/AdminShell";
import CompanyLogisticsWorkspace from "../components/CompanyLogisticsWorkspace";

export default function LogisticsModulePage() {
  return (
    <AdminShell title="Distribution & Logistics" user={null}>
      <CompanyLogisticsWorkspace initialSection="overview" />
    </AdminShell>
  );
}
