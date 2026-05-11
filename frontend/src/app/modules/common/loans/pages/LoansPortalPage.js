"use client";
import EntityWorkspacePage from "@/src/app/modules/common/entity-workspace/pages/EntityWorkspacePage";

export default function LoansPortalPage() {
  return <EntityWorkspacePage
    title="Loans & Advances"
    description="Employee loans, distributor advances, personal loans, repayments, balances, and finance posting foundation."
    endpoint="/loans"
    recordsKeys={["loans", "data", "items"]}
    columns={[
      { label: "Loan", accessor: (row) => row.loanNo || row.documentNo || row.title || row._id },
      { label: "Party", accessor: (row) => row.employee?.fullName || row.user?.fullName || row.partyName || row.borrowerName },
      { label: "Amount", accessor: (row) => row.amount || row.principalAmount || 0 },
      { label: "Balance", accessor: (row) => row.balanceAmount || row.balance || 0 },
      { label: "Status", accessor: (row) => row.status || "active", status: true },
    ]}
    kpis={[
      { label: "Principal", value: (rows) => rows.reduce((sum, row) => sum + Number(row.amount || row.principalAmount || 0), 0), help: "Total loan principal" },
      { label: "Outstanding", value: (rows) => rows.reduce((sum, row) => sum + Number(row.balanceAmount || row.balance || 0), 0), help: "Remaining loan balance" },
      { label: "Active Loans", value: (rows) => rows.filter((row) => String(row.status || "active").toLowerCase() === "active").length, help: "Loans still active" },
    ]}
    workflows={[
      { title: "Loan Creation", description: "Admin or finance user creates loan/advance with repayment plan." },
      { title: "Repayment", description: "Cash/bank repayment reduces loan balance and posts account transaction." },
      { title: "Payroll Link", description: "Later, employee repayment can be deducted automatically from payroll." },
    ]}
  />;
}
