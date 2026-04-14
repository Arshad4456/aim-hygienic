"use client";

import AdminShell from "../../components/AdminShell";
import CompanyLogisticsWorkspace from "../../components/CompanyLogisticsWorkspace";

export default function LogisticsDispatchPage() {
  return (
    <AdminShell title="Dispatch & Delivery" user={null}>
      <CompanyLogisticsWorkspace initialSection="dispatch" />
    </AdminShell>
  );
}
