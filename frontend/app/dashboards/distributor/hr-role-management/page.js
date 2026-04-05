"use client";

import { useMemo, useState } from "react";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

const roleOptions = [
  { key: "salesman", label: "Salesman" },
  { key: "orderBooker", label: "Order Booker" },
  { key: "customer", label: "Customer" },
];

const defaultTerritory = "North Territory";

export default function DistributorHrRoleManagementPage() {
  const [selectedRole, setSelectedRole] = useState(roleOptions[0].key);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("");

  const selectedRoleLabel = useMemo(
    () => roleOptions.find((item) => item.key === selectedRole)?.label || "Salesman",
    [selectedRole]
  );

  function submitForm(event) {
    event.preventDefault();

    if (!fullName.trim() || !phone.trim()) {
      setNotice("Please enter both name and phone number.");
      return;
    }

    setNotice(
      `${selectedRoleLabel} created for ${defaultTerritory}. Assignments outside this territory are not allowed.`
    );

    setFullName("");
    setPhone("");
  }

  return (
    <UserDashboardShell
      title="Distributor HR & Role Management"
      subtitle="Add salesman, order bookers, and customers only within your assigned territory."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Territory rule: You can only create <strong>Salesman</strong>, <strong>Order Booker</strong>, and <strong>Customer</strong> users for your own territory.
        </div>

        <form onSubmit={submitForm} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-zinc-700">
            User Role
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              {roleOptions.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-zinc-700">
            Territory
            <input
              value={defaultTerritory}
              readOnly
              className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700"
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-700">
            Full Name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={`Enter ${selectedRoleLabel} full name`}
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="space-y-2 text-sm text-zinc-700">
            Phone Number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter contact number"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Add {selectedRoleLabel}
            </button>
          </div>
        </form>

        {notice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {notice}
          </div>
        ) : null}
      </div>
    </UserDashboardShell>
  );
}
