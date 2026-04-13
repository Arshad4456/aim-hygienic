"use client";

import AdminShell from "../../components/AdminShell";
import ProcurementWorkspace from "../../components/ProcurementWorkspace";

export default function PurchaseOrdersPage() {
  return (
    <AdminShell title="Purchase Documents" user={null}>
      <ProcurementWorkspace initialModuleKey="purchaseOrders" />
    </AdminShell>
  );
}
