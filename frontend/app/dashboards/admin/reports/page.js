"use client";

import AdminShell from "../components/AdminShell";
import useCompanyScope from "../components/useCompanyScope";
import { ReportsDashboardModule } from "../../../../src/modules/reports";

export default function ReportsModulePage() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();

  return (
    <AdminShell title="Reports" user={null}>
      <ReportsDashboardModule
        variant="admin"
        companies={companies}
        companyDocId={companyDocId}
        setCompanyDocId={setCompanyDocId}
        selectedCompany={selectedCompany}
        canSelectCompany={canSelectCompany}
      />
    </AdminShell>
  );
}