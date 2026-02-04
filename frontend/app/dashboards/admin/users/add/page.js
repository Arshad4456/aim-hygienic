"use client";

import { useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";

const companies = [
  { id: "C-001", name: "AIM Hygienic" },
  { id: "C-002", name: "CleanPro Supplies" },
];

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
    "manager_id",
    "manager_name",
    "company_id",
    "company_name",
    "company_branch_id",
    "branch_name_or_number",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
  ],
  "Warehouse Manager": [
    "ware_manager_id",
    "warehouse_manager_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
  ],
  Accountant: [
    "accountant_id",
    "accountant_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "region_id",
    "region_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
  ],
  Distributor: [
    "distributor_id",
    "distributor_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "region_id",
    "region_name",
    "zone_id",
    "zone_name",
    "area_id",
    "area_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
  ],
  Driver: [
    "driver_id",
    "driver_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "region_id",
    "region_name",
    "zone_id",
    "zone_name",
    "area_id",
    "area_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
    "gps_latitude",
    "gps_longitude",
  ],
  "Delivery Boy": [
    "deliveryboy_id",
    "deliveryboy_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "region_id",
    "region_name",
    "zone_id",
    "zone_name",
    "area_id",
    "area_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
    "gps_latitude",
    "gps_longitude",
  ],
  "Sales Man": [
    "salesman_id",
    "salesman_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "region_id",
    "region_name",
    "zone_id",
    "zone_name",
    "area_id",
    "area_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
    "gps_latitude",
    "gps_longitude",
  ],
  "Order Booker": [
    "orderbooker_id",
    "orderbooker_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "region_id",
    "region_name",
    "zone_id",
    "zone_name",
    "area_id",
    "area_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "address",
  ],
  Customer: [
    "customer_id",
    "customer_name",
    "company_id",
    "company_name",
    "branch_id",
    "branch_name_or_number",
    "warehouse_id",
    "warehouse_name",
    "region_id",
    "region_name",
    "zone_id",
    "zone_name",
    "area_id",
    "area_name",
    "shop_id",
    "shop_name",
    "cnic_no",
    "mobile_number",
    "phone_number",
    "password",
    "email",
    "shop_address",
  ],
};

const labelMap = {
  manager_id: "Manager ID",
  manager_name: "Manager Name",
  company_id: "Company ID",
  company_name: "Company Name",
  company_branch_id: "Company Branch ID",
  branch_id: "Branch ID",
  branch_name_or_number: "Branch Name/Number",
  warehouse_id: "Warehouse ID",
  warehouse_name: "Warehouse Name",
  ware_manager_id: "Warehouse Manager ID",
  warehouse_manager_name: "Warehouse Manager Name",
  accountant_id: "Accountant ID",
  accountant_name: "Accountant Name",
  distributor_id: "Distributor ID",
  distributor_name: "Distributor Name",
  driver_id: "Driver ID",
  driver_name: "Driver Name",
  deliveryboy_id: "Delivery Boy ID",
  deliveryboy_name: "Delivery Boy Name",
  salesman_id: "Salesman ID",
  salesman_name: "Salesman Name",
  orderbooker_id: "Order Booker ID",
  orderbooker_name: "Order Booker Name",
  customer_id: "Customer ID",
  customer_name: "Customer Name",
  region_id: "Region ID",
  region_name: "Region Name",
  zone_id: "Zone ID",
  zone_name: "Zone Name",
  area_id: "Area ID",
  area_name: "Area Name",
  shop_id: "Shop ID",
  shop_name: "Shop Name",
  cnic_no: "CNIC No",
  mobile_number: "Mobile Number",
  phone_number: "Phone Number",
  password: "Password",
  email: "Email",
  address: "Address",
  shop_address: "Shop Address",
  gps_latitude: "GPS Latitude",
  gps_longitude: "GPS Longitude",
};

export default function AddUserPage() {
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState({});
  const [ok, setOk] = useState("");

  const activeFields = useMemo(() => roleFields[role] || [], [role]);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    setOk(`✅ ${role} saved (demo only).`);
  }

  const selectedCompany = companies.find((c) => c.id === companyId);

  return (
    <AdminShell title="Add User" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add User</div>
        <div className="text-sm text-zinc-500 mt-1">Select a company and role to create a user.</div>

        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Select Company</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setRole("");
                setForm({});
              }}
            >
              <option value="">Choose company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
                setForm({ role: e.target.value });
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
            Selected company: <span className="font-medium text-zinc-900">{selectedCompany.name}</span> ({selectedCompany.id})
          </div>
        ) : null}

        {role ? (
          <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">
                Save {role}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed px-4 py-6 text-sm text-zinc-500 text-center">
            Please select a role to view the form fields.
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
