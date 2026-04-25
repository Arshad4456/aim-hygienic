"use client";
import AdminShell from "../../components/AdminShell";
import VehicleMasterForm from "../../components/VehicleMasterForm";

export default function VehicleManagementAddPage() {
  return <AdminShell title="Vehicle Management · Add Vehicle" user={null}><div className="rounded-2xl bg-white border shadow-sm p-5"><VehicleMasterForm /></div></AdminShell>;
}