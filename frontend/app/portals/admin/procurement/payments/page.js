"use client";

import AdminShell from "../../components/AdminShell";
import ProcurementWorkspace from "../../components/ProcurementWorkspace";

export default function SupplierPaymentsPage() {
  return (
    <AdminShell title="Supplier Invoice & Payments" user={null}>
      <ProcurementWorkspace initialModuleKey="payments" />
    </AdminShell>
  );
}
