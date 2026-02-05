"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const categoryOptions = [
  {
    label: "Diaper",
    value: "Diaper",
    subCategories: [
      "Mamia Crown",
      "Mamia Premium Jumbo",
      "Mamia Extra",
      "Royal Baby",
      "Adult Mamia",
    ],
  },
  {
    label: "Pades",
    value: "Pades",
    subCategories: ["Mamia Pades"],
  },
  {
    label: "Dishwash",
    value: "Dishwash",
    subCategories: ["Mamia Dishwash"],
  },
  {
    label: "Soap",
    value: "Soap",
    subCategories: ["Mamia Soap"],
  },
  {
    label: "Washing Powder",
    value: "Washing Powder",
    subCategories: ["Turkey Gold"],
  },
  {
    label: "Wipes",
    value: "Wipes",
    subCategories: ["Mamia", "Royal", "Crown", "Optima"],
  },
];

export default function AddProductPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [form, setForm] = useState({
    productId: "",
    name: "",
    category: "",
    subCategory: "",
    size: "",
    initialPrice: "",
    customerPrice: "",
    salePrice: "",
    barcode: "",
    sku: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

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

  const selectedCompany = companies.find((c) => c._id === companyId);
  const subCategories = useMemo(() => {
    const item = categoryOptions.find((c) => c.value === form.category);
    return item?.subCategories || [];
  }, [form.category]);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await apiFetch("/products", {
        method: "POST",
        body: {
          ...form,
          companyId: selectedCompany?.companyId || "",
          companyName: selectedCompany?.name || "",
        },
      });
      setOk("✅ Product saved successfully.");
      setForm({
        productId: "",
        name: "",
        category: "",
        subCategory: "",
        size: "",
        initialPrice: "",
        customerPrice: "",
        salePrice: "",
        barcode: "",
        sku: "",
        description: "",
      });
    } catch (e2) {
      setErr(e2.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Product" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Product</div>
        <div className="text-sm text-zinc-500 mt-1">Create a product and assign it to a company.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-5 text-sm text-zinc-500">Loading companies...</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Select Company</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                <option value="">Choose company...</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <Field label="Product ID" value={form.productId} onChange={(v) => setField("productId", v)} required />
            <Field label="Product Name" value={form.name} onChange={(v) => setField("name", v)} required />

            <div>
              <Label>Category</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                required
              >
                <option value="">Select category...</option>
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Sub-Category</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.subCategory}
                onChange={(e) => setField("subCategory", e.target.value)}
              >
                <option value="">Select sub-category...</option>
                {subCategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <Field label="Size" value={form.size} onChange={(v) => setField("size", v)} placeholder="Small, Medium, Large, 2XL" />
            <Field label="Initial Price" value={form.initialPrice} onChange={(v) => setField("initialPrice", v)} type="number" />
            <Field label="Customer Price" value={form.customerPrice} onChange={(v) => setField("customerPrice", v)} type="number" />
            <Field label="Sale Price" value={form.salePrice} onChange={(v) => setField("salePrice", v)} type="number" />
            <Field label="Barcode" value={form.barcode} onChange={(v) => setField("barcode", v)} />
            <Field label="SKU" value={form.sku} onChange={(v) => setField("sku", v)} />

            <div className="md:col-span-2">
              <Label>Description</Label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 mt-2">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Product"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required = false, placeholder }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
