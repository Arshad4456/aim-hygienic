"use client";
import EntityWorkspacePage from "@/src/modules/common/entity-workspace/pages/EntityWorkspacePage";

export default function ErpTemplatesPortalPage() {
  return <EntityWorkspacePage
    title="ERP Templates"
    description="Business-type templates for Distribution ERP, Trading ERP, Manufacturing ERP, Retail/POS ERP, Service ERP, Logistics ERP, and Custom ERP. Super Admin uses these templates when creating companies."
    endpoint="/erp-templates"
    recordsKeys={["templates", "erpTemplates", "data", "items"]}
    columns={[
      { label: "Template", accessor: (row) => row.name || row.templateName },
      { label: "Key", accessor: (row) => row.key || row.erpTemplateKey },
      { label: "Modules", accessor: (row) => row.modules || row.enabledModules || [] },
      { label: "Status", accessor: (row) => row.status || "active", status: true },
    ]}
    kpis={[
      { label: "Active Templates", value: (rows) => rows.filter((row) => String(row.status || "active").toLowerCase() === "active").length, help: "Templates available for company setup" },
      { label: "Avg Modules", value: (rows) => rows.length ? Math.round(rows.reduce((sum, row) => sum + Number((row.modules || row.enabledModules || []).length || 0), 0) / rows.length) : 0, help: "Average modules enabled per template" },
      { label: "Customizable", value: "Yes", help: "Company package can enable/disable modules later" },
    ]}
    workflows={[
      { title: "Template → Company", description: "Super Admin selects a template and the system prepares module access, default roles, and workflow terminology." },
      { title: "ERP Type Control", description: "Distribution companies use supplier → company → distributor → customer, while other templates can use different workflows." },
      { title: "Future Package Limits", description: "Templates will connect with subscriptions, user limits, storage limits, and mobile role access." },
    ]}
  />;
}
