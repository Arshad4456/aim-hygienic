"use client";

import AdminShell from "../components/AdminShell";
import CompanyFinanceWorkspace from "../components/CompanyFinanceWorkspace";

export default function FinanceModulePage() {
  return (
    <AdminShell title="Finance & Accounts" user={null}>
      <CompanyFinanceWorkspace initialSection="overview" />
    </AdminShell>
  );
}
