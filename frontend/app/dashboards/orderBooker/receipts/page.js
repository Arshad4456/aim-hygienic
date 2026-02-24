"use client";

import ReceiptCenter from "../../components/ReceiptCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <ReceiptCenter
      title="Order Booker Receipts"
      subtitle="Generate payment receipts and track admin approval status."
      roleKey="OrderBooker"
      links={userDashboardSearchItems.orderBooker || []}
    />
  );
}