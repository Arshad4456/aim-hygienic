"use client";
import EntityWorkspacePage from "../../common/pages/EntityWorkspacePage";

export default function NotificationCenterPage() {
  return <EntityWorkspacePage
    title="Notification Center"
    description="This replaces the old Messages concept. Phase 15 will connect in-app notifications, mobile push, SMS, WhatsApp, and email triggers. For now, existing messages are shown through the real portal layer."
    endpoint="/messages"
    recordsKeys={["messages", "notifications", "data", "items"]}
    columns={[
      { label: "Title", accessor: (row) => row.title || row.subject || row.message || row.body },
      { label: "Channel", accessor: (row) => row.channel || row.type || "in_app" },
      { label: "Recipient", accessor: (row) => row.recipient?.fullName || row.to?.fullName || row.to || row.role || "Role/User" },
      { label: "Date", accessor: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : "-" },
      { label: "Status", accessor: (row) => row.status || row.readStatus || "sent", status: true },
    ]}
    kpis={[
      { label: "Unread", value: (rows) => rows.filter((row) => row.read === false || String(row.readStatus || "").toLowerCase() === "unread").length, help: "Notifications not yet read" },
      { label: "Channels", value: "5", help: "In-app, push, SMS, WhatsApp, email" },
      { label: "Automation", value: "Phase 15", help: "Trigger engine comes in notification phase" },
    ]}
    workflows={[
      { title: "Order & Delivery Alerts", description: "Order approved, dispatch assigned, delivery completed, and invoice generated alerts." },
      { title: "Finance Alerts", description: "Payment received, overdue invoice, supplier payment, and low balance alerts." },
      { title: "Mobile Push First", description: "Mobile app notifications should replace basic messages for field users and delivery teams." },
    ]}
  />;
}
