"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function TerritoryAssetsRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="Territory & Assets"
      endpointMap={{
        regions: "/regions",
        zones: "/zones",
        territories: "/areas",
        fields: "/fields",
        vehicles: "/vehicles",
        assets: "/vehicles",
      }}
    />
  );
}