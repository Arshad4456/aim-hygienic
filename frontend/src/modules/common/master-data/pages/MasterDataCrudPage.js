"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut, withQuery } from "@/src/services/apiClient";

function readArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload && typeof payload === "object") return Object.values(payload).find(Array.isArray) || [];
  return [];
}

function readValue(row, accessor) {
  if (typeof accessor === "function") return accessor(row);
  return String(accessor || "").split(".").reduce((value, key) => value?.[key], row);
}

function idOf(row) {
  return row?._id || row?.id || row?.companyId || row?.productId || row?.warehouseId || row?.regionId || row?.zoneId || row?.areaId || row?.fieldId;
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number(value).toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") return value.name || value.title || value.partyName || value.companyName || value.fullName || value.username || value._id || "Record";
  return String(value);
}

function statusPill(value) {
  const text = formatCell(value);
  const safe = text.toLowerCase();
  const color = safe.includes("active") || safe.includes("paid") || safe.includes("posted") || safe.includes("approved")
    ? "bg-emerald-50 text-emerald-700"
    : safe.includes("pending") || safe.includes("draft") || safe.includes("partial")
      ? "bg-amber-50 text-amber-700"
      : safe.includes("inactive") || safe.includes("blocked") || safe.includes("suspended")
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{text}</span>;
}

function blankForm(fields = [], defaults = {}) {
  const base = { ...defaults };
  fields.forEach((field) => {
    if (base[field.key] === undefined) base[field.key] = field.defaultValue ?? "";
  });
  return base;
}

function rowToForm(row = {}, fields = [], defaults = {}) {
  const base = blankForm(fields, defaults);
  fields.forEach((field) => {
    const value = field.fromRow ? field.fromRow(row) : row?.[field.key];
    base[field.key] = value ?? "";
  });
  return base;
}

function sanitizePayload(form = {}, config = {}) {
  const payload = { ...(config.defaultPayload || {}) };
  (config.fields || []).forEach((field) => {
    if (field.readOnly) return;
    let value = form[field.key];
    if (field.type === "number") value = Number(value || 0);
    if (field.type === "checkbox") value = Boolean(value);
    if (field.type === "hidden" && value === "") value = field.defaultValue || value;
    if (field.required || value !== "") payload[field.key] = value;
  });
  return config.transformPayload ? config.transformPayload(payload, form) : payload;
}

function exportCsv(filename, columns, rows) {
  const headers = columns.map((c) => c.label);
  const body = rows.map((row) => columns.map((c) => `"${String(formatCell(readValue(row, c.accessor))).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FieldInput({ field, value, onChange }) {
  if (field.type === "hidden") return null;
  if (field.type === "select") {
    return <label className="space-y-1 text-sm font-bold text-slate-700"><span>{field.label}</span><select value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400"><option value="">{field.placeholder || `Select ${field.label}`}</option>{(field.options || []).map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}</select></label>;
  }
  if (field.type === "textarea") {
    return <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2"><span>{field.label}</span><textarea value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder || field.label} rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400" /></label>;
  }
  if (field.type === "checkbox") {
    return <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(field.key, e.target.checked)} /> {field.label}</label>;
  }
  return <label className="space-y-1 text-sm font-bold text-slate-700"><span>{field.label}</span><input type={field.type || "text"} value={value ?? ""} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder || field.label} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-400" /></label>;
}

export const MASTER_DATA_RESOURCES = {
  products: {
    title: "Product Master",
    eyebrow: "Master Data CRUD",
    description: "Create, edit, search, export, and maintain SKUs used by procurement, inventory, sales, POS, and manufacturing modules.",
    endpoint: "/products",
    recordsKeys: ["products"],
    filename: "rawyan-products.csv",
    columns: [
      { label: "Product", accessor: (row) => row.name || row.productName },
      { label: "Product ID", accessor: "productId" },
      { label: "SKU/Barcode", accessor: (row) => row.sku || row.barcode || row.code },
      { label: "Category", accessor: "category" },
      { label: "Unit", accessor: "unit" },
      { label: "Retail", accessor: "retailPrice" },
      { label: "Min Stock", accessor: "minStockLevel" },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "productId", label: "Product ID", required: true },
      { key: "name", label: "Product Name", required: true },
      { key: "sku", label: "SKU" },
      { key: "barcode", label: "Barcode" },
      { key: "category", label: "Category" },
      { key: "subCategory", label: "Sub Category" },
      { key: "unit", label: "Unit" },
      { key: "retailPrice", label: "Retail Price", type: "number" },
      { key: "wholesalePrice", label: "Wholesale Price", type: "number" },
      { key: "tradePrice", label: "Trade Price", type: "number" },
      { key: "costPrice", label: "Cost Price", type: "number" },
      { key: "minStockLevel", label: "Min Stock Level", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  suppliers: {
    title: "Supplier Master",
    eyebrow: "Procurement Master Data",
    description: "Manage suppliers, payment terms, credit limits, and opening balances used by purchase orders and supplier invoices.",
    endpoint: "/procurement/suppliers",
    recordsKeys: ["suppliers"],
    filename: "rawyan-suppliers.csv",
    columns: [
      { label: "Supplier", accessor: (row) => row.supplierName || row.fullName || row.username },
      { label: "Code", accessor: "supplierCode" },
      { label: "Phone", accessor: (row) => row.phone || row.mobile },
      { label: "City", accessor: "city" },
      { label: "Balance", accessor: (row) => row.currentBalance || row.openingBalance || 0 },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "supplierCode", label: "Supplier Code" },
      { key: "supplierName", label: "Supplier Name", required: true },
      { key: "contactName", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "taxNo", label: "Tax No" },
      { key: "paymentTermsDays", label: "Payment Terms Days", type: "number" },
      { key: "creditLimit", label: "Credit Limit", type: "number" },
      { key: "openingBalance", label: "Opening Balance", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive", "blocked"], defaultValue: "active" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  warehouses: {
    title: "Warehouse Master",
    eyebrow: "Inventory Master Data",
    description: "Create stock locations used by goods receipts, stock transfers, dispatch preparation, and inventory valuation.",
    endpoint: "/warehouses",
    recordsKeys: ["warehouses"],
    filename: "rawyan-warehouses.csv",
    columns: [
      { label: "Warehouse", accessor: (row) => row.name || row.warehouseName },
      { label: "Warehouse ID", accessor: "warehouseId" },
      { label: "Phone", accessor: (row) => row.phone || row.phoneNumber || row.mobileNumber },
      { label: "Capacity", accessor: "capacity" },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "warehouseId", label: "Warehouse ID", required: true },
      { key: "name", label: "Warehouse Name", required: true },
      { key: "phoneNumber", label: "Phone" },
      { key: "city", label: "City" },
      { key: "managerName", label: "Manager Name" },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], defaultValue: "active" },
      { key: "address", label: "Address", type: "textarea" },
    ],
  },
  regions: {
    title: "Regions",
    eyebrow: "Territory Master Data",
    description: "Create regions as the top level of territory structure for reporting, users, warehouses, and sales coverage.",
    endpoint: "/regions",
    recordsKeys: ["regions"],
    filename: "rawyan-regions.csv",
    columns: [
      { label: "Region", accessor: "name" },
      { label: "Region ID", accessor: "regionId" },
      { label: "Warehouse", accessor: "warehouseName" },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "regionId", label: "Region ID", required: true },
      { key: "name", label: "Region Name", required: true },
      { key: "warehouseId", label: "Warehouse ID" },
      { key: "warehouseName", label: "Warehouse Name" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], defaultValue: "active" },
    ],
  },
  zones: {
    title: "Zones",
    eyebrow: "Territory Master Data",
    description: "Create zones under regions for route planning, order booking, and distributor coverage.",
    endpoint: "/zones",
    recordsKeys: ["zones"],
    filename: "rawyan-zones.csv",
    columns: [
      { label: "Zone", accessor: "name" },
      { label: "Zone ID", accessor: "zoneId" },
      { label: "Region", accessor: "regionName" },
      { label: "Warehouse", accessor: "warehouseName" },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "zoneId", label: "Zone ID", required: true },
      { key: "name", label: "Zone Name", required: true },
      { key: "regionId", label: "Region ID" },
      { key: "regionName", label: "Region Name" },
      { key: "warehouseId", label: "Warehouse ID" },
      { key: "warehouseName", label: "Warehouse Name" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], defaultValue: "active" },
    ],
  },
  areas: {
    title: "Territories / Areas",
    eyebrow: "Territory Master Data",
    description: "Create territories and areas for customer coverage, distributor assignment, and field sales reporting.",
    endpoint: "/areas",
    recordsKeys: ["areas"],
    filename: "rawyan-areas.csv",
    columns: [
      { label: "Territory", accessor: "name" },
      { label: "Area ID", accessor: "areaId" },
      { label: "Zone", accessor: "zoneName" },
      { label: "Region", accessor: "regionName" },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "areaId", label: "Area/Territory ID", required: true },
      { key: "name", label: "Area/Territory Name", required: true },
      { key: "zoneId", label: "Zone ID" },
      { key: "zoneName", label: "Zone Name" },
      { key: "regionId", label: "Region ID" },
      { key: "regionName", label: "Region Name" },
      { key: "warehouseId", label: "Warehouse ID" },
      { key: "warehouseName", label: "Warehouse Name" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], defaultValue: "active" },
    ],
  },
  fields: {
    title: "Fields / Beats",
    eyebrow: "Territory Master Data",
    description: "Create beat-level fields for salesmen, order bookers, live tracking, and delivery assignments.",
    endpoint: "/fields",
    recordsKeys: ["fields"],
    filename: "rawyan-fields.csv",
    columns: [
      { label: "Field", accessor: "name" },
      { label: "Field ID", accessor: "fieldId" },
      { label: "Territory", accessor: "territoryName" },
      { label: "Zone", accessor: "zoneName" },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "fieldId", label: "Field/Beat ID", required: true },
      { key: "name", label: "Field/Beat Name", required: true },
      { key: "territoryId", label: "Territory ID" },
      { key: "territoryName", label: "Territory Name" },
      { key: "zoneId", label: "Zone ID" },
      { key: "zoneName", label: "Zone Name" },
      { key: "regionId", label: "Region ID" },
      { key: "regionName", label: "Region Name" },
      { key: "warehouseId", label: "Warehouse ID" },
      { key: "warehouseName", label: "Warehouse Name" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive"], defaultValue: "active" },
    ],
  },
  customers: {
    title: "Customer / Retailer Master",
    eyebrow: "Customer Master Data",
    description: "Create and maintain customers used by secondary sales, invoices, receipts, collections, and customer portal billing.",
    endpoint: "/users",
    queryParams: { role: "Customer" },
    recordsKeys: ["users"],
    filename: "rawyan-customers.csv",
    defaultPayload: { role: "Customer", mobileAccess: true },
    columns: [
      { label: "Customer", accessor: (row) => row.fullName || row.businessName || row.username },
      { label: "Mobile", accessor: (row) => row.mobile || row.mobileNumber },
      { label: "Territory", accessor: (row) => row.territoryName || row.areaName },
      { label: "Business", accessor: "businessName" },
      { label: "Status", accessor: "status", status: true },
    ],
    fields: [
      { key: "companyId", label: "Company ID", placeholder: "Required for System Admin" },
      { key: "companyName", label: "Company Name" },
      { key: "fullName", label: "Customer Name", required: true },
      { key: "username", label: "Username" },
      { key: "mobile", label: "Mobile", required: true },
      { key: "email", label: "Email" },
      { key: "password", label: "Password", type: "password", placeholder: "Required for new customer" },
      { key: "businessName", label: "Business / Shop Name" },
      { key: "territoryId", label: "Territory ID" },
      { key: "territoryName", label: "Territory Name" },
      { key: "fieldId", label: "Field ID" },
      { key: "fieldName", label: "Field Name" },
      { key: "status", label: "Status", type: "select", options: ["active", "inactive", "deactive"], defaultValue: "active" },
      { key: "shopAddress", label: "Shop Address", type: "textarea" },
    ],
    transformPayload(payload, form) {
      if (!payload.username) payload.username = payload.mobile;
      if (!form.password) delete payload.password;
      return payload;
    },
  },
};

export default function MasterDataCrudPage({ resourceKey }) {
  const config = MASTER_DATA_RESOURCES[resourceKey] || MASTER_DATA_RESOURCES.products;
  const [rows, setRows] = useState([]);
  const [payload, setPayload] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => blankForm(config.fields, config.defaultPayload));

  async function load() {
    setLoading(true); setError("");
    try {
      const result = await apiGet(withQuery(config.endpoint, config.queryParams || {}));
      setPayload(result || {});
      setRows(readArray(result, config.recordsKeys));
    } catch (e) {
      setError(e.message || `Unable to load ${config.title}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [resourceKey]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row || {}).toLowerCase().includes(q));
  }, [rows, query]);

  const kpis = useMemo(() => {
    const active = rows.filter((row) => String(row.status || "active").toLowerCase() === "active").length;
    const inactive = rows.length - active;
    return [
      { label: "Total Records", value: rows.length, help: "Live database records" },
      { label: "Active", value: active, help: "Ready for ERP workflows" },
      { label: "Inactive / Other", value: inactive, help: "Blocked, inactive, or alternate status" },
      { label: "Search Result", value: filteredRows.length, help: "Rows matching current filter" },
    ];
  }, [filteredRows.length, rows]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(blankForm(config.fields, config.defaultPayload));
    setShowForm(true);
    setNotice("");
    setError("");
  }

  function openEdit(row) {
    setEditing(row);
    setForm(rowToForm(row, config.fields, config.defaultPayload));
    setShowForm(true);
    setNotice("");
    setError("");
  }

  async function saveRecord(event) {
    event?.preventDefault?.();
    setSaving(true); setError(""); setNotice("");
    try {
      const data = sanitizePayload(form, config);
      const id = idOf(editing);
      if (editing && id) await apiPut(`${config.endpoint}/${id}`, data);
      else await apiPost(config.endpoint, data);
      setNotice(`${config.title} record ${editing ? "updated" : "created"} successfully.`);
      setShowForm(false); setEditing(null); setForm(blankForm(config.fields, config.defaultPayload));
      await load();
    } catch (e) {
      setError(e.message || "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(row) {
    const id = idOf(row);
    if (!id || !window.confirm(`Delete this ${config.title} record?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiDelete(`${config.endpoint}/${id}`);
      setNotice("Record deleted successfully.");
      await load();
    } catch (e) {
      setError(e.message || "Unable to delete record");
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-6">
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.32em] text-emerald-600">{config.eyebrow}</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-950">{config.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{config.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Refresh</button>
          <button onClick={() => exportCsv(config.filename, config.columns, filteredRows)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Export CSV</button>
          <button onClick={() => window.print()} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Print</button>
          <button onClick={openCreate} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">Create New</button>
        </div>
      </div>
    </section>

    {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}
    {notice ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p><p className="mt-3 text-3xl font-black text-slate-950">{Number(item.value || 0).toLocaleString()}</p><p className="mt-2 text-sm text-slate-500">{item.help}</p></div>)}
    </div>

    {showForm ? <form onSubmit={saveRecord} className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">{editing ? "Edit" : "Create"} {config.title}</h3><p className="text-sm text-slate-500">Fields are connected with real API endpoints. Company ID is only needed when a System Admin creates tenant-scoped records.</p></div><button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600">Close</button></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {config.fields.map((field) => <FieldInput key={field.key} field={field} value={form[field.key]} onChange={updateField} />)}
      </div>
      <button disabled={saving} className="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50">{saving ? "Saving…" : editing ? "Update Record" : "Create Record"}</button>
    </form> : null}

    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h3 className="text-lg font-black text-slate-950">Records</h3><p className="text-xs text-slate-500">{filteredRows.length} shown from {rows.length} records</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold outline-none focus:border-cyan-400 lg:w-80" />
      </div>
      {loading ? <div className="p-6 text-sm text-slate-500">Loading records…</div> : <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{config.columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}<th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{filteredRows.map((row, index) => <tr key={idOf(row) || index} className="border-t border-slate-100">{config.columns.map((column) => { const value = readValue(row, column.accessor); return <td key={column.label} className="px-4 py-3 align-middle text-slate-700">{column.status ? statusPill(value) : formatCell(value)}</td>; })}<td className="whitespace-nowrap px-4 py-3"><button onClick={() => openEdit(row)} className="mr-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">Edit</button><button onClick={() => deleteRecord(row)} disabled={saving} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 disabled:opacity-50">Delete</button></td></tr>)}{!filteredRows.length ? <tr><td colSpan={(config.columns.length || 0) + 1} className="px-4 py-10 text-center text-slate-400">No records found yet.</td></tr> : null}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
