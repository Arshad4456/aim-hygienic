"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const categoryOptions = [
  { label: "Wipes", value: "Wipes", subCategories: ["Royal Baby Wipes", "Mamia Wipes 42-sheets", "Mamia Crown Wipes", "Mamia Wipes Gentle", "Wipes Premium"] },
  { label: "Xtra Eco", value: "Xtra Eco", subCategories: ["Xtra Eco"] },
  { label: "ADULT", value: "ADULT", subCategories: ["Adult"] },
  { label: "Optima", value: "Optima", subCategories: ["Optima Soap", "Optima Wipes"] },
  { label: "Mamia Crown Eco", value: "Mamia Crown Eco", subCategories: ["Mamia Crown Eco"] },
  { label: "Mamia Crown Jumbo", value: "Mamia Crown Jumbo", subCategories: ["Mamia Crown Jumbo"] },
  { label: "Mamia Dishwash", value: "Mamia Dishwash", subCategories: ["Mamia Dishwash Lemon", "Mamia Dishwash"] },
  { label: "Mamia Soap", value: "Mamia Soap", subCategories: ["Mamia Soap"] },
  { label: "Mamia Pads", value: "Mamia Pads", subCategories: ["Value Pack", "Single Pack", "Travel Pack"] },
  { label: "Razor", value: "Razor", subCategories: ["Razor"] },
  { label: "Xtra", value: "Xtra", subCategories: ["Xtra Jumbo"] },
  { label: "BABY DIAPER", value: "BABY DIAPER", subCategories: ["Jumbo Pack", "Twin Pack", "Small Pack"] },
  { label: "Royal Baby", value: "Royal Baby", subCategories: ["Royal Baby Jumbo", "Royal Baby Eco"] },
  { label: "Royal Baby Wipes", value: "Royal Baby Wipes", subCategories: ["Royal Baby Wipes"] },
  { label: "Comfery Adult", value: "Comfery Adult", subCategories: ["Comfery Adult"] },
];

const fieldDefs = [
  { key: "code", label: "Code" },
  { key: "productId", label: "Product ID" },
  { key: "name", label: "Product Name" },
  { key: "alternativeName", label: "Alternative Name" },
  { key: "barcode", label: "Bar Code" },
  { key: "bulkBarcode", label: "Bulk Bar Code" },
  { key: "size", label: "Size" },
  { key: "unit", label: "Unit" },
  { key: "cartonSize", label: "Carton Size", type: "number" },
  { key: "packSize", label: "Pack Size", type: "number" },
  { key: "retailPrice", label: "Retail Price", type: "number" },
  { key: "wholesalePrice", label: "Wholesale Price", type: "number" },
  { key: "tradePrice", label: "Trade Price", type: "number" },
  { key: "taxablePrice", label: "Taxable Price", type: "number" },
  { key: "costPrice", label: "Cost Price", type: "number" },
  { key: "discountPer", label: "Discount %", type: "number" },
  { key: "unitScheme", label: "Unit Scheme", type: "number" },
  { key: "taxPer", label: "Tax %", type: "number" },
  { key: "fedPer", label: "FED %", type: "number" },
  { key: "weight", label: "Weight", type: "number" },
  { key: "weightUnitName", label: "Weight Unit Name" },
  { key: "taxTypeName", label: "Tax Type Name" },
  { key: "activationType", label: "Activation Type" },
  { key: "sku", label: "SKU" },
  { key: "description", label: "Description", type: "textarea", full: true },
];

const boolDefs = [
  { key: "isTaxFromCustomer", label: "Is Tax From Customer" },
  { key: "isTaxAppliedOnBonus", label: "Is Tax Applied On Bonus" },
  { key: "isTaxAppliedAfterDiscountAndScheme", label: "Is Tax Applied After Discount & Scheme" },
  { key: "isDiscountAppliedAfterScheme", label: "Is Discount Applied After Scheme" },
];

const templateHeaders = [
  "Code", "Bar Code", "BulkBarCode", "Product Name", "Size", "Alternative Name", "Carton Size", "Pack Size",
  "Retail Price", "Wholesale Price", "Trade Price", "Taxable Price", "Cost Price", "Discount Per", "Unit Scheme",
  "is Tax From Customer", "Is Tax Applied On Bonus", "Is Tax Applied After Discount And Scheme",
  "Is Discount Applied After Scheme", "Weight", "Weight Unit Name", "Sub Category Name", "Tax Per", "FED Per",
  "Company Name", "Category Name", "Tax Type Name", "Activation Type",
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

const emptyForm = {
  code: "",
  productId: "",
  name: "",
  alternativeName: "",
  companyId: "",
  companyName: "",
  category: "",
  subCategory: "",
  size: "",
  unit: "",
  weight: "",
  weightUnitName: "",
  cartonSize: "",
  packSize: "",
  retailPrice: "",
  wholesalePrice: "",
  tradePrice: "",
  taxablePrice: "",
  customerPrice: "",
  costPrice: "",
  discountPer: "",
  unitScheme: "",
  isTaxFromCustomer: false,
  isTaxAppliedOnBonus: false,
  isTaxAppliedAfterDiscountAndScheme: false,
  isDiscountAppliedAfterScheme: false,
  taxPer: "",
  fedPer: "",
  taxTypeName: "",
  activationType: "Active",
  barcode: "",
  bulkBarcode: "",
  sku: "",
  description: "",
};

function normalizeHeader(header) {
  return String(header || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseBulkText(input) {
  const lines = String(input || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ["Please paste header + at least one row."] };

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const mapped = headers.map((h) => columnMap[normalizeHeader(h)] || null);
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(delimiter).map((v) => v.trim());
    const row = {};
    mapped.forEach((key, idx) => {
      if (key) row[key] = values[idx] || "";
    });

    row.productId = String(row.code || "").trim();
    row.customerPrice = row.wholesalePrice;

    if (!row.productId || !row.name) {
      errors.push(`Row ${i + 1}: missing Code or Product Name`);
      continue;
    }

    rows.push(row);
  }

  return { rows, errors };
}

function downloadTemplate() {
  const csv = `${templateHeaders.join(",")}\n`;
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "products-import-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AddProductPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function loadCompaniesAndUser() {
      try {
        const me = await apiFetch("/users/me");
        const user = me?.user || null;
        const userRole = String(user?.role || "").trim().toLowerCase();
        const scopedCompanyId = String(user?.companyId || "").trim();
        const scopedCompanyName = String(user?.companyName || "").trim();
        const isSystemAdmin = userRole === "admin" || userRole === "system admin";

        setCurrentUser(user);
        if (!isSystemAdmin) {
          if (scopedCompanyId) {
            setCompanies([{ _id: scopedCompanyId, companyId: scopedCompanyId, name: scopedCompanyName || scopedCompanyId }]);
            setCompanyId(scopedCompanyId);
          } else {
            setCompanies([]);
          }
          return;
        }

        try {
          const companiesRes = await apiFetch("/companies");
          setCompanies(companiesRes.companies || []);
        } catch (companiesErr) {
          if (scopedCompanyId) {
            setCompanies([{ _id: scopedCompanyId, companyId: scopedCompanyId, name: scopedCompanyName || scopedCompanyId }]);
            setCompanyId(scopedCompanyId);
          } else {
            throw companiesErr;
          }
        }
      } catch (e) {
        setErr(e.message || "Failed to load companies");
      } finally {
        setLoading(false);
      }
    }
    loadCompaniesAndUser();
  }, []);

  const normalizedRole = String(currentUser?.role || "").trim().toLowerCase();
  const canSelectCompany = normalizedRole === "admin" || normalizedRole === "system admin" || !normalizedRole;
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
          code: form.code || form.productId,
          productId: form.productId || form.code,
          companyId: selectedCompany?.companyId || form.companyId,
          companyName: selectedCompany?.name || form.companyName,
          customerPrice: form.wholesalePrice,
        },
      });
      setOk("✅ Product saved successfully.");
      setForm(emptyForm);
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
    if (!selectedCompany?.companyId) {
      setErr("Please select a company before importing products.");
      return;
    }
    const parsed = parseBulkText(bulkInput);
    setBulkErrors(parsed.errors || []);
    if (!parsed.rows.length) return;

    const scopedRows = parsed.rows.map((row) => ({
      ...row,
      companyId: selectedCompany.companyId,
      companyName: selectedCompany.name,
    }));

    setBulkSaving(true);
    try {
      const data = await apiFetch("/products/bulk-upsert", { method: "POST", body: { rows: scopedRows } });
      setBulkSummary(data.summary || null);
      setOk("✅ Bulk import completed.");
      if (!data.summary?.skipped) setBulkInput("");
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Bulk Import from Excel/Google Sheets</div>
              <div className="text-sm text-zinc-500 mt-1">Paste tabular data or download the compatible CSV template.</div>
            </div>
            <button type="button" onClick={downloadTemplate} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50">
              Download Excel/Sheets Template
            </button>
          </div>

          <div className="mt-4">
            <Label>Select Company for Bulk Import</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-600"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={!canSelectCompany}
            >
              <option value="">{canSelectCompany ? "Choose company..." : "Company selected by role"}</option>
              {companies.map((c) => <option key={`bulk-${c._id}`} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {bulkErrors.length ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="font-medium">Rows skipped before upload:</div>
              <ul className="list-disc pl-5 mt-1">{bulkErrors.slice(0, 10).map((it) => <li key={it}>{it}</li>)}</ul>
            </div>
          ) : null}

          {bulkSummary ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Imported: {bulkSummary.processed}/{bulkSummary.received} · Inserted: {bulkSummary.inserted} · Updated: {bulkSummary.updated} · Skipped: {bulkSummary.skipped}
            </div>
          ) : null}

          <textarea value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} rows={10} placeholder="Paste Excel table here..." className="mt-4 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
          <div className="mt-3">
            <button type="button" onClick={handleBulkImport} disabled={bulkSaving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {bulkSaving ? "Importing..." : "Import Pasted Data"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="text-xl font-semibold text-zinc-900">Add Product Manually</div>
          <div className="text-sm text-zinc-500 mt-1">All updated product fields are available below.</div>

          {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
          {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

          {loading ? <div className="mt-5 text-sm text-zinc-500">Loading companies...</div> : (
            <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Select Company</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-600"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={!canSelectCompany}
                >
                  <option value="">{canSelectCompany ? "Choose company..." : "Company selected by role"}</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <Field label="Category" value={form.category} onChange={(v) => setField("category", v)} as="select" options={["", ...categoryOptions.map((c) => c.value)]} />
              <Field label="Sub-Category" value={form.subCategory} onChange={(v) => setField("subCategory", v)} as="select" options={["", ...subCategories]} />

              {fieldDefs.map((f) => (
                <Field key={f.key} label={f.label} value={form[f.key]} onChange={(v) => setField(f.key, v)} type={f.type || "text"} full={f.full} required={f.key === "productId" || f.key === "name"} />
              ))}

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border p-3">
                {boolDefs.map((b) => (
                  <label key={b.key} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={Boolean(form[b.key])} onChange={(e) => setField(b.key, e.target.checked)} />
                    {b.label}
                  </label>
                ))}
              </div>

              <div className="md:col-span-2 flex items-center gap-3 mt-2">
                <button disabled={saving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
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

function Field({ label, value, onChange, type = "text", full = false, required = false, as, options = [] }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label>{label}</Label>
      {as === "select" ? (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200">
          {options.map((opt) => <option key={opt || "blank"} value={opt}>{opt || "Select..."}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value || ""} required={required} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" rows={3} />
      ) : (
        <input type={type} required={required} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" />
      )}
    </div>
  );
}