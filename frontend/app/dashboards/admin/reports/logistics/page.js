"use client";

import AdminShell from "../../components/AdminShell";
import useCompanyScope from "../../components/useCompanyScope";
import { ReportsSectionPage } from "../../../../../src/modules/reports";

export default function LogisticsReportPage() {
  const { selectedCompany } = useCompanyScope();
  return (
    <AdminShell title="Reports" user={null}>
      <ReportsSectionPage
        sectionKey="logistics"
        companyId={selectedCompany?._id || selectedCompany?.companyId || ""}
        companyName={selectedCompany?.name || selectedCompany?.companyName || ""}
      />
    </AdminShell>
  );
}