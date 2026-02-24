"use client";

import AdminShell from "../../../components/AdminShell";
import VehicleMasterForm from "../../../components/VehicleMasterForm";

export default function AddVehiclePage() {
  return (
    <AdminShell title="Add Vehicle" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Vehicle</div>
        <div className="text-sm text-zinc-500 mt-1">Unified vehicle master form.</div>
        <div className="mt-4">
          <VehicleMasterForm />
        </div>
      </div>
    </AdminShell>
  );
}