"use client";
import EntityWorkspacePage from "../../common/pages/EntityWorkspacePage";

export default function ExpensesPortalPage() {
  return <EntityWorkspacePage
    title="Expenses"
    description="Company and distributor expense control for daily expenses, personal expenses, distributor expenses, approvals, and finance posting."
    endpoint="/expenses"
    recordsKeys={["expenses", "data", "items"]}
    columns={[
      { label: "Expense", accessor: (row) => row.title || row.expenseTitle || row.description || row.category },
      { label: "Category", accessor: (row) => row.category || row.expenseType || "General" },
      { label: "Amount", accessor: (row) => row.amount || row.totalAmount || 0 },
      { label: "Date", accessor: (row) => row.date ? new Date(row.date).toLocaleDateString() : row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-" },
      { label: "Status", accessor: (row) => row.status || row.approvalStatus || "draft", status: true },
    ]}
    kpis={[
      { label: "Total Amount", value: (rows) => rows.reduce((sum, row) => sum + Number(row.amount || row.totalAmount || 0), 0), help: "Total recorded expense amount" },
      { label: "Pending", value: (rows) => rows.filter((row) => String(row.status || row.approvalStatus || "").toLowerCase().includes("pending")).length, help: "Expenses waiting for approval" },
      { label: "Posted", value: (rows) => rows.filter((row) => String(row.status || "").toLowerCase().includes("posted")).length, help: "Expenses posted to finance" },
    ]}
    workflows={[
      { title: "Company Expenses", description: "Head office, branch, warehouse, vehicle, salary advance, and operational expenses." },
      { title: "Distributor Expenses", description: "Distributor may manage own expense book separate from company supplier and primary sales finance." },
      { title: "Finance Posting", description: "Approved expenses should create account transactions and appear in ledger reports." },
    ]}
  />;
}
