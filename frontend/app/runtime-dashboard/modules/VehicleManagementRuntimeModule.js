"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function VehicleManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="Vehicle Management"
      endpointMap={{
        fleet: "/vehicles",
        trips: "/vehicle-management/trips",
        maintenance: "/vehicle-management/maintenance",
      }}
    />
  );
}
