"use client";

import AdminShell from "../../components/AdminShell";
import CompanyLogisticsWorkspace from "../../components/CompanyLogisticsWorkspace";

export default function LogisticsRoutesPage() {
  return (
    <AdminShell title="Route Planning" user={null}>
      <CompanyLogisticsWorkspace initialSection="routes" />
    </AdminShell>
  );
}
