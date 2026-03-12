"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function ExpenseManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="Expense Management"
      endpointMap={{
        daily: "/expenses?type=daily",
        personal: "/expenses?type=personal",
        distributor: "/expenses?type=distributor",
        claims: "/expenses",
      }}
    />
  );
}