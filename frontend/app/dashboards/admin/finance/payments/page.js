"use client";

import AdminShell from "../../components/AdminShell";
import CompanyFinanceWorkspace from "../../components/CompanyFinanceWorkspace";

export default function FinancePaymentsPage() {
  return (
    <AdminShell title="Supplier Bills & Payments" user={null}>
      <CompanyFinanceWorkspace initialSection="payments" />
    </AdminShell>
  );
}
