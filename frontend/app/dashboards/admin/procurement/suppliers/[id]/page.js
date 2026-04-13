"use client";

import AdminShell from "../../../components/AdminShell";
import SupplierProfileWorkspace from "../../../components/SupplierProfileWorkspace";

export default function SupplierProfilePage({ params }) {
  return (
    <AdminShell title="Supplier Profile" user={null}>
      <SupplierProfileWorkspace supplierId={params?.id} />
    </AdminShell>
  );
}
