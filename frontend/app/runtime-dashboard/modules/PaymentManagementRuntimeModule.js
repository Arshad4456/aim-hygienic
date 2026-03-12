"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function PaymentManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="Payment Management"
      endpointMap={{
        primary: "/payments/primary",
        secondary: "/payments/secondary",
        payments: "/payments",
      }}
    />
  );
}