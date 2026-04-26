"use client";
import EntityWorkspacePage from "../../common/pages/EntityWorkspacePage";

export default function CustomersPortalPage() {
  return <EntityWorkspacePage
    title="Customers & Retailers"
    description="Customer and retailer records used by distributor secondary sales, customer invoices, customer receipts, outstanding balance, and customer portal billing."
    endpoint="/users"
    recordsKeys={["users", "data", "items"]}
    columns={[
      { label: "Customer/User", accessor: (row) => row.partyName || row.fullName || row.name || row.username },
      { label: "Role", accessor: (row) => row.role || row.roleName || row.portalType },
      { label: "Phone", accessor: (row) => row.phone || row.mobile || row.contact },
      { label: "Territory", accessor: (row) => row.area?.name || row.zone?.name || row.region?.name || row.territoryName },
      { label: "Status", accessor: (row) => row.status || "active", status: true },
    ]}
    kpis={[
      { label: "Customer Roles", value: (rows) => rows.filter((row) => String(row.role || row.portalType || "").toLowerCase().includes("customer")).length, help: "Users marked as customers" },
      { label: "Distributor Users", value: (rows) => rows.filter((row) => String(row.role || row.portalType || "").toLowerCase().includes("distributor")).length, help: "Distributor users/parties" },
      { label: "Mobile Ready", value: (rows) => rows.filter((row) => row.mobileAccess || row.allowMobile).length, help: "Users with mobile access enabled" },
    ]}
    workflows={[
      { title: "Secondary Sales", description: "Distributor or field user creates customer order, delivers product, and generates customer invoice." },
      { title: "Customer Billing", description: "Customer portal shows invoices, receipts, payment history, outstanding balance, and returns." },
      { title: "Territory Assignment", description: "Customers should be assigned to region, zone, area, route, or salesperson for real distribution reporting." },
    ]}
  />;
}
