"use client";

import AdminShell from "../../components/AdminShell";
import ProcurementWorkspace from "../../components/ProcurementWorkspace";

export default function SupplierMasterPage() {
  return (
    <AdminShell title="Supplier Master" user={null}>
      <ProcurementWorkspace initialModuleKey="suppliers" />
    </AdminShell>
  );
}
