"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const categories = ["Diaper", "Pades", "Dishwash", "Soap", "Washing Powder", "Wipes"];

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
    async function loadCompanies() {
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

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await apiFetch("/products");
        setRows(data.products || []);
      } catch (e) {
        setErr(e.message || "Failed to load products");
      }
    }
    loadProducts();
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
        [p.productId, p.name, p.category, p.subCategory, p.companyName]
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
            <div className="text-sm text-zinc-500 mt-1">Manage all product records.</div>
          </div>
          <a
            href="/dashboards/admin/products/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Product
          </a>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Select Company</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Search</Label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Search by id, name, category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubCategoryFilter("");
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Sub-Category</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
            >
              <option value="">All sub-categories</option>
              {subCategoryOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-4 py-2 text-xs ${categoryFilter === "" ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-50"}`}
            onClick={() => setCategoryFilter("")}
          >
            All ({filtered.length})
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`rounded-full border px-4 py-2 text-xs ${categoryFilter === c ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-50"}`}
              onClick={() => setCategoryFilter(c)}
            >
              {c} ({categoryCounts[c] || 0})
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product ID</th>
                <th className="text-left px-3 py-2 border-b">Name</th>
                <th className="text-left px-3 py-2 border-b">Category</th>
                <th className="text-left px-3 py-2 border-b">Sub-Category</th>
                <th className="text-left px-3 py-2 border-b">Size</th>
                <th className="text-left px-3 py-2 border-b">Sale Price</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No products found</td></tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.category}</td>
                    <td className="px-3 py-2 border-b">{row.subCategory || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.size || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.salePrice}</td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(row._id)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <div>
            Page {page} of {totalPages} (showing up to {perPage} products per page)
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {editId ? (
        <EditCard form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSave} />
      ) : null}
    </AdminShell>
  );
}

function EditCard({ form, onChange, onClose, onSave }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Product</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Product ID" value={form.productId} onChange={(v) => onChange((s) => ({ ...s, productId: v }))} />
          <Field label="Product Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Category" value={form.category} onChange={(v) => onChange((s) => ({ ...s, category: v }))} />
          <Field label="Sub-Category" value={form.subCategory} onChange={(v) => onChange((s) => ({ ...s, subCategory: v }))} />
          <Field label="Size" value={form.size} onChange={(v) => onChange((s) => ({ ...s, size: v }))} />
          <Field label="Initial Price" value={form.initialPrice} onChange={(v) => onChange((s) => ({ ...s, initialPrice: v }))} type="number" />
          <Field label="Customer Price" value={form.customerPrice} onChange={(v) => onChange((s) => ({ ...s, customerPrice: v }))} type="number" />
          <Field label="Sale Price" value={form.salePrice} onChange={(v) => onChange((s) => ({ ...s, salePrice: v }))} type="number" />
          <Field label="Barcode" value={form.barcode} onChange={(v) => onChange((s) => ({ ...s, barcode: v }))} />
          <Field label="SKU" value={form.sku} onChange={(v) => onChange((s) => ({ ...s, sku: v }))} />
          <div className="md:col-span-2">
            <Label>Description</Label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              rows={3}
              value={form.description || ""}
              onChange={(e) => onChange((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            onClick={onSave}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            Update
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </div>
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
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}