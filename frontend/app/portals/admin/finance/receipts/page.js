"use client";

import AdminShell from "../../components/AdminShell";
import CompanyFinanceWorkspace from "../../components/CompanyFinanceWorkspace";

export default function FinanceReceiptsPage() {
  return (
    <AdminShell title="Distributor Receipts" user={null}>
      <CompanyFinanceWorkspace initialSection="receipts" />
    </AdminShell>
  );
}
