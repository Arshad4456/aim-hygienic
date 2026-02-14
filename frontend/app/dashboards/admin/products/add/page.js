"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const categoryOptions = [
  {
    label: "Diaper",
    value: "Diaper",
    subCategories: ["Mamia Crown", "Mamia Premium Jumbo", "Mamia Extra", "Royal Baby", "Adult Mamia"],
  },
  { label: "Pades", value: "Pades", subCategories: ["Mamia Pades"] },
  { label: "Dishwash", value: "Dishwash", subCategories: ["Mamia Dishwash"] },
  { label: "Soap", value: "Soap", subCategories: ["Mamia Soap"] },
  { label: "Washing Powder", value: "Washing Powder", subCategories: ["Turkey Gold"] },
  { label: "Wipes", value: "Wipes", subCategories: ["Mamia", "Royal", "Crown", "Optima"] },
];

const columnMap = {
  code: "code",
  barcode: "barcode",
  bulkbarcode: "bulkBarcode",
  productname: "name",
  size: "size",
  alternativename: "alternativeName",
  cartonsize: "cartonSize",
  packsize: "packSize",
  retailprice: "retailPrice",
  wholesaleprice: "wholesalePrice",
  tradeprice: "tradePrice",
  taxableprice: "taxablePrice",
  costprice: "costPrice",
  discountper: "discountPer",
  unitscheme: "unitScheme",
  istaxfromcustomer: "isTaxFromCustomer",
  istaxappliedonbonus: "isTaxAppliedOnBonus",
  istaxappliedafterdiscountandscheme: "isTaxAppliedAfterDiscountAndScheme",
  isdiscountappliedafterscheme: "isDiscountAppliedAfterScheme",
  reorderlevel: "minStockLevel",
  weight: "weight",
  weightunitname: "weightUnitName",
  subcategoryname: "subCategory",
  taxper: "taxPer",
  fedper: "fedPer",
  companyname: "companyName",
  categoryname: "category",
  taxtypename: "taxTypeName",
  activationtype: "activationType",
};

function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function splitRow(line, delimiter) {
  if (!line) return [];
  return line.split(delimiter).map((part) => part.trim());
}

function parseBulkText(input) {
  const lines = String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["Please paste header + at least one data row."] };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitRow(lines[0], delimiter);
  const mappedKeys = headers.map((h) => columnMap[normalizeHeader(h)] || null);

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitRow(lines[i], delimiter);
    const row = {};

    mappedKeys.forEach((key, idx) => {
      if (!key) return;
      row[key] = values[idx] ?? "";
    });

    row.productId = String(row.code || "").trim();
    row.initialPrice = row.retailPrice;
    row.customerPrice = row.wholesalePrice;
    row.salePrice = row.tradePrice;
    row.sellingPrice = row.tradePrice;
    row.unit = row.weightUnitName;

    if (!row.productId || !row.name) {
      errors.push(`Row ${i + 1}: missing Code or Product Name`);
      continue;
    }

    rows.push(row);
  }

  return { rows, errors };
}

export default function AddProductPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [form, setForm] = useState({
    productId: "",
    name: "",
    category: "",
    subCategory: "",
    size: "",
    unit: "",
    initialPrice: "",
    customerPrice: "",
    salePrice: "",
    costPrice: "",
    sellingPrice: "",
    minStockLevel: "",
    barcode: "",
    sku: "",
    description: "",
  });
  const [bulkInput, setBulkInput] = useState("");
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
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
        unit: "",
        initialPrice: "",
        customerPrice: "",
        salePrice: "",
        costPrice: "",
        sellingPrice: "",
        minStockLevel: "",
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

  async function handleBulkImport() {
    setErr("");
    setOk("");
    setBulkSummary(null);
    const parsed = parseBulkText(bulkInput);
    setBulkErrors(parsed.errors || []);

    if (!parsed.rows.length) return;

    setBulkSaving(true);
    try {
      const data = await apiFetch("/products/bulk-upsert", {
        method: "POST",
        body: { rows: parsed.rows },
      });
      setBulkSummary(data.summary || null);
      setOk("✅ Bulk import completed.");
      if (!data.summary?.skipped) {
        setBulkInput("");
      }
    } catch (e) {
      setErr(e.message || "Bulk import failed");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <AdminShell title="Add Product" user={null}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="text-xl font-semibold text-zinc-900">Bulk Import from Excel Copy/Paste</div>
          <div className="text-sm text-zinc-500 mt-1">
            Paste tab-separated data copied from Excel (must include the same headers as your sheet).
          </div>

          {bulkErrors.length ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="font-medium">Some rows were skipped before upload:</div>
              <ul className="list-disc pl-5 mt-1">
                {bulkErrors.slice(0, 10).map((rowError) => (
                  <li key={rowError}>{rowError}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {bulkSummary ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Imported: {bulkSummary.processed} / {bulkSummary.received} rows · Inserted: {bulkSummary.inserted} · Updated: {bulkSummary.updated} · Skipped: {bulkSummary.skipped}
            </div>
          ) : null}

          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={10}
            placeholder="Paste Excel table here..."
            className="mt-4 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />

          <div className="mt-3">
            <button
              type="button"
              onClick={handleBulkImport}
              disabled={bulkSaving}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {bulkSaving ? "Importing..." : "Import Pasted Data"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="text-xl font-semibold text-zinc-900">Add Product Manually</div>
          <div className="text-sm text-zinc-500 mt-1">Create a single product and assign it to a company.</div>

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
              <Field label="Unit" value={form.unit} onChange={(v) => setField("unit", v)} placeholder="pcs, box, kg" />
              <Field label="Initial Price" value={form.initialPrice} onChange={(v) => setField("initialPrice", v)} type="number" />
              <Field label="Customer Price" value={form.customerPrice} onChange={(v) => setField("customerPrice", v)} type="number" />
              <Field label="Sale Price" value={form.salePrice} onChange={(v) => setField("salePrice", v)} type="number" />
              <Field label="Cost Price" value={form.costPrice} onChange={(v) => setField("costPrice", v)} type="number" />
              <Field label="Selling Price" value={form.sellingPrice} onChange={(v) => setField("sellingPrice", v)} type="number" />
              <Field label="Minimum Stock Level" value={form.minStockLevel} onChange={(v) => setField("minStockLevel", v)} type="number" />
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