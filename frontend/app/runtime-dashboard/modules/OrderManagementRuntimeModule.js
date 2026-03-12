"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function OrderManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="Order Management"
      endpointMap={{
        primary_orders: "/orders",
        secondary_orders: "/orders",
        approvals: "/orders/pending",
        dispatch: "/orders/approved",
        returns: "/returns",
      }}
    />
  );
}
