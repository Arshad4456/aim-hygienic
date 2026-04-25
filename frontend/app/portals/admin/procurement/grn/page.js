"use client";

import AdminShell from "../../components/AdminShell";
import ProcurementWorkspace from "../../components/ProcurementWorkspace";

export default function GrnPage() {
  return (
    <AdminShell title="Goods Receipt Waiting" user={null}>
      <ProcurementWorkspace initialModuleKey="grn" />
    </AdminShell>
  );
}
