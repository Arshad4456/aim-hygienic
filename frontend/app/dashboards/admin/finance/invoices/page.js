"use client";

import AdminShell from "../../components/AdminShell";
import CompanyFinanceWorkspace from "../../components/CompanyFinanceWorkspace";

export default function FinanceInvoicesPage() {
  return (
    <AdminShell title="Distributor Invoices" user={null}>
      <CompanyFinanceWorkspace initialSection="invoices" />
    </AdminShell>
  );
}
