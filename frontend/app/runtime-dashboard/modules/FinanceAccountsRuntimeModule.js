"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function FinanceAccountsRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="Finance & Accounts"
      endpointMap={{
        invoices: "/reports?type=invoices",
        receipts: "/receipts",
        aging: "/reports?type=aging",
        payments: "/payments",
      }}
    />
  );
}
