"use client";

import ReceiptCenter from "../../components/ReceiptCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <ReceiptCenter
      title="Distributor Receipts"
      subtitle="Generate payment receipts and track admin approval status."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
    />
  );
}