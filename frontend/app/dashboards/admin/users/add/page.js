"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const roleOptions = [
  "Sales Manager",
  "Warehouse Manager",
  "Accountant",
  "Distributor",
  "Driver",
  "Delivery Boy",
  "Sales Man",
  "Order Booker",
  "Customer",
];

const roleFields = {
  "Sales Manager": [
    "managerId",
    "managerName",
    "companyId",
    "companyName",
    "companyBranchId",
    "branchNameOrNumber",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
  ],
  "Warehouse Manager": [
    "warehouseManagerId",
    "warehouseManagerName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
  ],
  Accountant: [
    "accountantId",
    "accountantName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "regionId",
    "regionName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
  ],
  Distributor: [
    "distributorId",
    "distributorName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "areaId",
    "areaName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
  ],
  Driver: [
    "driverId",
    "driverName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "areaId",
    "areaName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
    "gpsLatitude",
    "gpsLongitude",
  ],
  "Delivery Boy": [
    "deliveryBoyId",
    "deliveryBoyName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "areaId",
    "areaName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
    "gpsLatitude",
    "gpsLongitude",
  ],
  "Sales Man": [
    "salesmanId",
    "salesmanName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "areaId",
    "areaName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
    "gpsLatitude",
    "gpsLongitude",
  ],
  "Order Booker": [
    "orderBookerId",
    "orderBookerName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "areaId",
    "areaName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "address",
  ],
  Customer: [
    "customerId",
    "customerName",
    "companyId",
    "companyName",
    "branchId",
    "branchNameOrNumber",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "areaId",
    "areaName",
    "shopId",
    "shopName",
    "cnicNo",
    "mobileNumber",
    "phoneNumber",
    "password",
    "email",
    "shopAddress",
  ],
};

const labelMap = {
  managerId: "Manager ID",
  managerName: "Manager Name",
  companyId: "Company ID",
  companyName: "Company Name",
  companyBranchId: "Company Branch ID",
  branchId: "Branch ID",
  branchNameOrNumber: "Branch Name/Number",
  warehouseId: "Warehouse ID",
  warehouseName: "Warehouse Name",
  warehouseManagerId: "Warehouse Manager ID",
  warehouseManagerName: "Warehouse Manager Name",
  accountantId: "Accountant ID",
  accountantName: "Accountant Name",
  distributorId: "Distributor ID",
  distributorName: "Distributor Name",
  driverId: "Driver ID",
  driverName: "Driver Name",
  deliveryBoyId: "Delivery Boy ID",
  deliveryBoyName: "Delivery Boy Name",
  salesmanId: "Salesman ID",
  salesmanName: "Salesman Name",
  orderBookerId: "Order Booker ID",
  orderBookerName: "Order Booker Name",
  customerId: "Customer ID",
  customerName: "Customer Name",
  regionId: "Region ID",
  regionName: "Region Name",
  zoneId: "Zone ID",
  zoneName: "Zone Name",
  areaId: "Area ID",
  areaName: "Area Name",
  shopId: "Shop ID",
  shopName: "Shop Name",
  cnicNo: "CNIC No",
  mobileNumber: "Mobile Number",
  phoneNumber: "Phone Number",
  password: "Password",
  email: "Email",
  address: "Address",
  shopAddress: "Shop Address",
  gpsLatitude: "GPS Latitude",
  gpsLongitude: "GPS Longitude",
};

function validatePassword(value) {
  if (!value || value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(value)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one symbol.";
  return "";
}

export default function AddUserPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ fullName: "", mobile: "", role: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function loadCompanies() {
      setErr("");
      try {
        const data = await apiFetch("/companies");
        setCompanies(data.companies || []);
      } catch (e) {
        setErr(e.message || "Failed to load companies");
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, []);

  const activeFields = useMemo(() => roleFields[role] || [], [role]);
  const selectedCompany = companies.find((c) => c._id === companyId);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setErr(passwordError);
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: {
          ...form,
          role,
          companyId: selectedCompany?.companyId || "",
          companyName: selectedCompany?.name || "",
          fullName: form.fullName,
          mobile: form.mobile,
        },
      });
      setOk(`✅ ${role} saved successfully.`);
      setForm({ fullName: "", mobile: "", role: "" });
      setRole("");
    } catch (e2) {
      setErr(e2.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add User" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add User</div>
        <div className="text-sm text-zinc-500 mt-1">Select a company and role to create a user.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">Loading companies...</div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Company</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setRole("");
                    setForm({ fullName: "", mobile: "", role: "" });
                  }}
                >
                  <option value="">Choose company...</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Select Role</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    setForm((s) => ({ ...s, role: e.target.value }));
                  }}
                  disabled={!companyId}
                >
                  <option value="">Choose role...</option>
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCompany ? (
              <div className="mt-4 rounded-xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                Selected company: <span className="font-medium text-zinc-900">{selectedCompany.name}</span> ({selectedCompany.companyId})
              </div>
            ) : null}

            {role ? (
              <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  value={form.fullName || ""}
                  onChange={(v) => setField("fullName", v)}
                  required
                />
                <Field
                  label="Mobile Number"
                  value={form.mobile || ""}
                  onChange={(v) => setField("mobile", v)}
                  required
                />
                {activeFields.map((field) => (
                  <Field
                    key={field}
                    label={labelMap[field] || field}
                    value={form[field] || ""}
                    onChange={(v) => setField(field, v)}
                    type={field === "password" ? "password" : "text"}
                  />
                ))}
                <div className="md:col-span-2 flex items-center gap-3 mt-2">
                  <button
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : `Save ${role}`}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed px-4 py-6 text-sm text-zinc-500 text-center">
                Please select a role to view the form fields.
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}