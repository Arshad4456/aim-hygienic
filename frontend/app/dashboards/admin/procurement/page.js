"use client";

import AdminShell from "../components/AdminShell";
import ProcurementWorkspace from "../components/ProcurementWorkspace";

export default function ProcurementModulePage() {
  return (
    <AdminShell title="Procurement & Supplier Management" user={null}>
      <ProcurementWorkspace initialModuleKey="overview" />
    </AdminShell>
  );
}
