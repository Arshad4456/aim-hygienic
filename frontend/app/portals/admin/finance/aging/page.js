"use client";

import AdminShell from "../../components/AdminShell";
import CompanyFinanceWorkspace from "../../components/CompanyFinanceWorkspace";

export default function FinanceAgingPage() {
  return (
    <AdminShell title="Aging & Account Balances" user={null}>
      <CompanyFinanceWorkspace initialSection="aging" />
    </AdminShell>
  );
}
