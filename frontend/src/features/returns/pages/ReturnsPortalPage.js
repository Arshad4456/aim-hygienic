"use client";
import EntityWorkspacePage from "../../common/pages/EntityWorkspacePage";

export default function ReturnsPortalPage() {
  return <EntityWorkspacePage
    title="Returns, Damage & Expiry"
    description="Return stock, damage, expiry, approval, warehouse receiving, distributor return request, and customer return flow."
    endpoint="/returns"
    recordsKeys={["returns", "returnDocuments", "data", "items"]}
    columns={[
      { label: "Return", accessor: (row) => row.documentNo || row.returnNo || row._id },
      { label: "Party", accessor: (row) => row.customer?.partyName || row.distributor?.partyName || row.partyName || row.partyType },
      { label: "Reason", accessor: (row) => row.reason || row.returnReason || row.type || "Return" },
      { label: "Amount", accessor: (row) => row.totalAmount || row.amount || 0 },
      { label: "Status", accessor: (row) => row.status || row.approvalStatus || "draft", status: true },
    ]}
    kpis={[
      { label: "Pending Returns", value: (rows) => rows.filter((row) => String(row.status || row.approvalStatus || "").toLowerCase().includes("pending")).length, help: "Waiting for approval" },
      { label: "Damage/Expiry", value: (rows) => rows.filter((row) => /damage|expiry|expired/i.test(`${row.reason || row.type || ""}`)).length, help: "Quality-related returns" },
      { label: "Return Value", value: (rows) => rows.reduce((sum, row) => sum + Number(row.totalAmount || row.amount || 0), 0), help: "Estimated value of returns" },
    ]}
    workflows={[
      { title: "Customer Return", description: "Customer returns product to distributor; stock and invoice adjustment happen after approval." },
      { title: "Distributor Return", description: "Distributor requests return to company; company reviews and receives stock if accepted." },
      { title: "Damage / Expiry", description: "Damaged or expired stock should not be available for normal sale after approval." },
    ]}
  />;
}
