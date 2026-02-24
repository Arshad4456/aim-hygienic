"use client";

import ReceiptCenter from "../../components/ReceiptCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <ReceiptCenter
      title="Customer Receipts"
      subtitle="Generate payment receipts and track admin approval status."
      roleKey="Customer"
      links={userDashboardSearchItems.customer || []}
    />
  );
}
