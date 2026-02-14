"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const categories = ["Wipes", "Xtra Eco", "ADULT", "Optima", "Mamia Crown Eco", "Mamia Crown Jumbo", "Mamia Dishwash", "Mamia Soap", "Mamia Pads", "Razor", "Xtra", "BABY DIAPER", "Royal Baby", "Royal Baby Wipes", "Comfery Adult"];

const tableColumns = [
  ["code", "Code"],
  ["productId", "Product ID"],
  ["name", "Product Name"],
  ["companyName", "Company"],
  ["category", "Category"],
  ["subCategory", "Sub-Category"],
  ["size", "Size"],
  ["alternativeName", "Alternative Name"],
  ["cartonSize", "Carton Size"],
  ["packSize", "Pack Size"],
  ["retailPrice", "Retail"],
  ["wholesalePrice", "Wholesale"],
  ["tradePrice", "Trade"],
  ["taxablePrice", "Taxable"],
  ["costPrice", "Cost"],
  ["discountPer", "Discount %"],
  ["unitScheme", "Unit Scheme"],
  ["isTaxFromCustomer", "Tax From Customer"],
  ["isTaxAppliedOnBonus", "Tax On Bonus"],
  ["isTaxAppliedAfterDiscountAndScheme", "Tax After Disc/Scheme"],
  ["isDiscountAppliedAfterScheme", "Disc After Scheme"],
  ["weight", "Weight"],
  ["weightUnitName", "Weight Unit"],
  ["taxPer", "Tax %"],
  ["fedPer", "FED %"],
  ["taxTypeName", "Tax Type"],
  ["activationType", "Activation"],
  ["barcode", "Bar Code"],
  ["bulkBarcode", "Bulk Bar Code"],
  ["sku", "SKU"],
];

const editFields = [
  ["code", "Code"],
  ["productId", "Product ID"],
  ["name", "Product Name"],
  ["companyName", "Company Name"],
  ["companyId", "Company ID"],
  ["category", "Category"],
  ["subCategory", "Sub-Category"],
  ["size", "Size"],
  ["unit", "Unit"],
  ["alternativeName", "Alternative Name"],
  ["cartonSize", "Carton Size", "number"],
  ["packSize", "Pack Size", "number"],
  ["retailPrice", "Retail Price", "number"],
  ["wholesalePrice", "Wholesale Price", "number"],
  ["tradePrice", "Trade Price", "number"],
  ["taxablePrice", "Taxable Price", "number"],
  ["costPrice", "Cost Price", "number"],
  ["discountPer", "Discount %", "number"],
  ["unitScheme", "Unit Scheme", "number"],
  ["weight", "Weight", "number"],
  ["weightUnitName", "Weight Unit Name"],
  ["taxPer", "Tax %", "number"],
  ["fedPer", "FED %", "number"],
  ["taxTypeName", "Tax Type Name"],
  ["activationType", "Activation Type"],
  ["barcode", "Bar Code"],
  ["bulkBarcode", "Bulk Bar Code"],
  ["sku", "SKU"],
];

const boolFields = [
  ["isTaxFromCustomer", "Is Tax From Customer"],
  ["isTaxAppliedOnBonus", "Is Tax Applied On Bonus"],
  ["isTaxAppliedAfterDiscountAndScheme", "Is Tax Applied After Discount & Scheme"],
  ["isDiscountAppliedAfterScheme", "Is Discount Applied After Scheme"],
];

export default function ProductListPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [companiesRes, productsRes] = await Promise.all([apiFetch("/companies"), apiFetch("/products")]);
        setCompanies(companiesRes.companies || []);
        setRows(productsRes.products || []);
      } catch (e) {
        setErr(e.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let next = rows;
    if (companyId) {
      const company = companies.find((c) => c._id === companyId);
      next = next.filter((p) => p.companyId === company?.companyId);
    }
    if (categoryFilter) next = next.filter((p) => p.category === categoryFilter);
    if (subCategoryFilter) next = next.filter((p) => p.subCategory === subCategoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      next = next.filter((p) =>
        [p.productId, p.code, p.name, p.companyName, p.category, p.subCategory, p.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return next;
  }, [rows, companyId, companies, categoryFilter, subCategoryFilter, search]);

  const categoryCounts = useMemo(() => {
    const counts = categories.reduce((acc, c) => ({ ...acc, [c]: 0 }), {});
    filtered.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  const subCategoryOptions = useMemo(() => {
    const scoped = categoryFilter ? filtered.filter((p) => p.category === categoryFilter) : filtered;
    return Array.from(new Set(scoped.map((p) => p.subCategory).filter(Boolean)));
  }, [filtered, categoryFilter]);

  const perPage = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  function startEdit(row) {
    setEditId(row._id);
    setEditForm({ ...row });
  }

  async function onDelete(id) {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      setRows((s) => s.filter((r) => r._id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onSave() {
    try {
      const data = await apiFetch(`/products/${editId}`, { method: "PUT", body: editForm });
      setRows((s) => s.map((r) => (r._id === editId ? data.product : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  return (
    <AdminShell title="Product List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Products</div>
            <div className="text-sm text-zinc-500 mt-1">All updated fields are visible in the list and edit form.</div>
          </div>
          <Link href="/dashboards/admin/products/add" className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">
            + Add Product
          </Link>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <FilterSelect label="Select Company" value={companyId} onChange={(v) => { setCompanyId(v); setPage(1); }} options={["", ...companies.map((c) => c._id)]} labels={(id) => (companies.find((c) => c._id === id)?.name || "All companies")} />
          <div>
            <Label>Search</Label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" placeholder="Search by code, id, name, company..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <FilterSelect label="Category" value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setSubCategoryFilter(""); setPage(1); }} options={["", ...categories]} labels={(v) => v || "All categories"} />
          <FilterSelect label="Sub-Category" value={subCategoryFilter} onChange={(v) => { setSubCategoryFilter(v); setPage(1); }} options={["", ...subCategoryOptions]} labels={(v) => v || "All sub-categories"} />
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          {categories.map((c) => <div key={c} className="rounded-xl border p-3"><div className="text-xs text-zinc-500">{c}</div><div className="text-lg font-semibold">{categoryCounts[c] || 0}</div></div>)}
        </div>

        <div className="mt-4 overflow-auto border rounded-xl">
          <table className="min-w-[2600px] w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                {tableColumns.map(([key, label]) => <th key={key} className="text-left px-3 py-2 border-b">{label}</th>)}
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={tableColumns.length + 1} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={tableColumns.length + 1} className="px-3 py-6 text-center text-zinc-500">No products found</td></tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50 align-top">
                    {tableColumns.map(([key]) => (
                      <td key={`${row._id}-${key}`} className="px-3 py-2 border-b whitespace-nowrap">{typeof row[key] === "boolean" ? (row[key] ? "Checked" : "Unchecked") : (row[key] ?? "-")}</td>
                    ))}
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(row)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Edit</button>
                        <button onClick={() => onDelete(row._id)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <div>Page {page} of {totalPages} (up to {perPage} rows/page)</div>
          <div className="flex gap-2">
            <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      </div>

      {editId ? <EditCard form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSave} /> : null}
    </AdminShell>
  );
}

function EditCard({ form, onChange, onClose, onSave }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[760px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Product</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {editFields.map(([key, label, type]) => <Field key={key} label={label} value={form[key]} onChange={(v) => onChange((s) => ({ ...s, [key]: v }))} type={type || "text"} />)}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border p-3">
            {boolFields.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => onChange((s) => ({ ...s, [key]: e.target.checked }))} />
                {label}
              </label>
            ))}
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <textarea className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" rows={3} value={form.description || ""} onChange={(e) => onChange((s) => ({ ...s, description: e.target.value }))} />
          </div>
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button onClick={onSave} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">Update</button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, labels }) {
  return (
    <div>
      <Label>{label}</Label>
      <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => <option key={opt || "blank"} value={opt}>{labels(opt)}</option>)}
      </select>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} type={type} className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" />
    </div>
  );
}
