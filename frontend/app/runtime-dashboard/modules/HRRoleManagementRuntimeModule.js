"use client";
import RuntimeDataModule from "./_RuntimeDataModule";

export default function HRRoleManagementRuntimeModule({ moduleItem }) {
  return (
    <RuntimeDataModule
      moduleItem={moduleItem}
      title="HR & Role Management"
      endpointMap={{
        users: "/users",
        roles: "/platform-admin/role-templates",
        attendance: "/reports",
        policies: "/companies",
      }}
    />
  );
}
