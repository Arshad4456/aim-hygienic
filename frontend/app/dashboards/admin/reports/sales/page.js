"use client";

import AdminShell from "../../components/AdminShell";
import useCompanyScope from "../../components/useCompanyScope";
import { ReportsSectionPage } from "../../../../../src/modules/reports";

export default function SalesReportPage() {
  const { selectedCompany } = useCompanyScope();
  return (
    <AdminShell title="Reports" user={null}>
      <ReportsSectionPage
        sectionKey="sales"
        companyId={selectedCompany?._id || selectedCompany?.companyId || ""}
        companyName={selectedCompany?.name || selectedCompany?.companyName || ""}
      />
    </AdminShell>
  );
}