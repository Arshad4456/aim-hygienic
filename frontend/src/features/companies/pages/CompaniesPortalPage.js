"use client";
import EntityWorkspacePage from "../../common/pages/EntityWorkspacePage";

export default function CompaniesPortalPage() {
  return <EntityWorkspacePage
    title="Companies & Branches"
    description="System Admin and Company Admin workspace for tenant companies, branch setup, ERP template access, and subscription readiness. This replaces the old admin company folders with one feature page."
    endpoint="/companies"
    recordsKeys={["companies", "data", "items"]}
    columns={[
      { label: "Company", accessor: (row) => row.companyName || row.name || row.businessName },
      { label: "ERP Type", accessor: (row) => row.erpTemplateKey || row.businessType || row.erpType || "distribution_erp" },
      { label: "Status", accessor: (row) => row.status || row.accountStatus || "active", status: true },
      { label: "Users", accessor: (row) => row.userLimit || row.maxUsers || row.usersCount || 0 },
      { label: "Created", accessor: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-" },
    ]}
    kpis={[
      { label: "Active", value: (rows) => rows.filter((row) => String(row.status || "active").toLowerCase() === "active").length, help: "Companies currently enabled" },
      { label: "ERP Templates", value: (rows) => new Set(rows.map((row) => row.erpTemplateKey || row.businessType).filter(Boolean)).size, help: "Different ERP types in use" },
      { label: "Branches", value: (rows) => rows.reduce((sum, row) => sum + Number(row.branches?.length || row.branchCount || 0), 0), help: "Branch records attached to companies" },
    ]}
    workflows={[
      { title: "SaaS Company Setup", description: "System Admin creates company, selects ERP template, sets package limits, then creates Company Admin." },
      { title: "Branch & Warehouse Setup", description: "Company Admin creates branches and warehouses before procurement, inventory, and sales flows start." },
      { title: "Portal Access", description: "Users open the same /portals route system; permissions decide what company data and actions are visible." },
    ]}
  />;
}
