"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createClientCompany,
  fetchSystemAdminOverview,
  saveSubscriptionPlan,
  seedSystemAdminDefaults,
  updateCompanyControl,
  updateModuleControl,
} from "../../../services/systemAdminService";

const DEFAULT_COMPANY_FORM = {
  companyId: "",
  name: "",
  email: "",
  phone1: "",
  phone2: "",
  mainOfficeAddress: "",
  erpTemplateKey: "distribution_erp",
  status: "trial",
  planKey: "starter",
  userLimit: 25,
  branchLimit: 1,
  warehouseLimit: 1,
  moduleLimit: 10,
  mobileUserLimit: 5,
  allowedModules: "dashboard,companies,users,roles,products,customers,procurement,inventory,warehouse,primary-sales-orders,secondary-sales-orders,finance,reports,settings",
  systemAdminNotes: "",
  adminFullName: "",
  adminUsername: "",
  adminMobile: "",
  adminEmail: "",
  adminPassword: "",
};

const DEFAULT_PLAN_FORM = {
  key: "growth",
  name: "Growth",
  description: "Best plan for growing distributors and trading companies.",
  monthlyPrice: 0,
  userLimit: 50,
  branchLimit: 5,
  warehouseLimit: 5,
  moduleLimit: 20,
  mobileUserLimit: 20,
  allowedModules: "dashboard,companies,users,roles,products,customers,procurement,inventory,warehouse,primary-sales-orders,secondary-sales-orders,finance,reports,settings",
  status: "active",
};

function splitCsv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function joinModules(value) {
  if (Array.isArray(value)) return value.join(",");
  return String(value || "");
}

function StatCard({ label, value, helper }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-3 text-4xl font-black text-slate-950">{value ?? 0}</p>
    {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
  </div>;
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
    purple: "bg-purple-50 text-purple-700",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function TextField({ label, value, onChange, type = "text", placeholder = "", multiline = false }) {
  const inputClass = "mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50";
  return <label className="block">
    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
    {multiline ? <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={inputClass} /> : <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />}
  </label>;
}

function SelectField({ label, value, onChange, options = [] }) {
  return <label className="block">
    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50">
      {options.map((option) => <option key={option.value || option.key || option} value={option.value || option.key || option}>{option.label || option.name || option}</option>)}
    </select>
  </label>;
}

function ToggleField({ label, checked, onChange, helper }) {
  return <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <span>
      <span className="block text-sm font-black text-slate-950">{label}</span>
      {helper ? <span className="mt-1 block text-xs text-slate-500">{helper}</span> : null}
    </span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 rounded border-slate-300 accent-emerald-600" />
  </label>;
}

function ModulePicker({ label = "Allowed modules", modules = [], value = "", onChange }) {
  const selected = new Set(splitCsv(value));
  const allSelected = selected.has("*");
  function toggle(key) {
    if (key === "*") return onChange(allSelected ? "" : "*");
    const next = new Set(Array.from(selected).filter((item) => item !== "*"));
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(Array.from(next).join(","));
  }
  return <div className="rounded-3xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <button type="button" onClick={() => toggle("*")} className={`rounded-full px-3 py-1 text-xs font-black ${allSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>All Modules</button>
    </div>
    <div className="mt-3 grid max-h-56 gap-2 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => {
        const active = allSelected || selected.has(module.key);
        return <button key={module.key} type="button" onClick={() => toggle(module.key)} className={`rounded-2xl border px-3 py-2 text-left text-xs font-bold transition ${active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"}`}>
          {module.name || module.key}
        </button>;
      })}
    </div>
  </div>;
}

function CreateCompanyPanel({ data, onSaved }) {
  const [form, setForm] = useState(DEFAULT_COMPANY_FORM);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const modules = data?.modules || [];
  const plans = data?.plans?.length ? data.plans : [{ key: "starter", name: "Starter" }];
  const templates = data?.templates?.length ? data.templates : [{ key: "distribution_erp", name: "Distribution ERP" }];

  function setField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function submit() {
    setBusy(true); setMessage(""); setError("");
    try {
      const payload = {
        ...form,
        userLimit: Number(form.userLimit || 0),
        branchLimit: Number(form.branchLimit || 0),
        warehouseLimit: Number(form.warehouseLimit || 0),
        moduleLimit: Number(form.moduleLimit || 0),
        mobileUserLimit: Number(form.mobileUserLimit || 0),
        allowedModules: splitCsv(form.allowedModules),
      };
      const result = await createClientCompany(payload);
      setMessage(result.message || "Client company created");
      setForm(DEFAULT_COMPANY_FORM);
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to create client company");
    } finally {
      setBusy(false);
    }
  }

  return <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">New client onboarding</p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">Create Client Company</h3>
        <p className="mt-1 text-sm text-slate-500">Create tenant, assign ERP template, subscription limits, module access, and optional first company admin.</p>
      </div>
      <Badge tone="blue">MongoDB Atlas tenant ready</Badge>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TextField label="Company ID" value={form.companyId} onChange={(v) => setField("companyId", v.toUpperCase())} placeholder="RAWYAN001" />
      <TextField label="Company name" value={form.name} onChange={(v) => setField("name", v)} placeholder="Client business name" />
      <TextField label="Email" value={form.email} onChange={(v) => setField("email", v)} />
      <TextField label="Phone" value={form.phone1} onChange={(v) => setField("phone1", v)} />
      <TextField label="WhatsApp" value={form.phone2} onChange={(v) => setField("phone2", v)} />
      <SelectField label="ERP Template" value={form.erpTemplateKey} onChange={(v) => setField("erpTemplateKey", v)} options={templates.map((t) => ({ value: t.key, label: t.name }))} />
      <SelectField label="Plan" value={form.planKey} onChange={(v) => setField("planKey", v)} options={plans.map((p) => ({ value: p.key, label: p.name }))} />
      <SelectField label="Status" value={form.status} onChange={(v) => setField("status", v)} options={["trial", "active", "inactive", "suspended", "expired", "cancelled"]} />
      <TextField label="Users" type="number" value={form.userLimit} onChange={(v) => setField("userLimit", v)} />
      <TextField label="Branches" type="number" value={form.branchLimit} onChange={(v) => setField("branchLimit", v)} />
      <TextField label="Warehouses" type="number" value={form.warehouseLimit} onChange={(v) => setField("warehouseLimit", v)} />
      <TextField label="Mobile users" type="number" value={form.mobileUserLimit} onChange={(v) => setField("mobileUserLimit", v)} />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <TextField label="Office address" value={form.mainOfficeAddress} onChange={(v) => setField("mainOfficeAddress", v)} multiline />
      <TextField label="System admin notes" value={form.systemAdminNotes} onChange={(v) => setField("systemAdminNotes", v)} multiline />
    </div>
    <div className="mt-4">
      <ModulePicker modules={modules} value={form.allowedModules} onChange={(v) => setField("allowedModules", v)} />
    </div>

    <div className="mt-5 rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-950">Optional first company admin</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TextField label="Admin name" value={form.adminFullName} onChange={(v) => setField("adminFullName", v)} />
        <TextField label="Username" value={form.adminUsername} onChange={(v) => setField("adminUsername", v)} />
        <TextField label="Mobile" value={form.adminMobile} onChange={(v) => setField("adminMobile", v)} />
        <TextField label="Email" value={form.adminEmail} onChange={(v) => setField("adminEmail", v)} />
        <TextField label="Password" type="password" value={form.adminPassword} onChange={(v) => setField("adminPassword", v)} />
      </div>
    </div>

    <button onClick={submit} disabled={busy} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50">{busy ? "Creating…" : "Create Client Company"}</button>
    {message ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
    {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p> : null}
  </div>;
}

function CompanyControlRow({ company, plans, modules, templates, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: company.name || "",
    email: company.email || "",
    phone1: company.phone1 || "",
    phone2: company.phone2 || "",
    mainOfficeAddress: company.mainOfficeAddress || "",
    planKey: company.planKey || "starter",
    status: company.status || "active",
    erpTemplateKey: company.erpTemplateKey || "distribution_erp",
    userLimit: company.userLimit || 0,
    branchLimit: company.branchLimit || 0,
    warehouseLimit: company.warehouseLimit || 0,
    moduleLimit: company.moduleLimit || 0,
    mobileUserLimit: company.mobileUserLimit || 0,
    expiresAt: company.expiresAt ? String(company.expiresAt).slice(0, 10) : "",
    allowedModules: joinModules(company.allowedModules || []),
    systemAdminNotes: company.systemAdminNotes || "",
    suspensionReason: company.suspensionReason || "",
  });

  function setField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      await updateCompanyControl(company.companyId, {
        ...form,
        userLimit: Number(form.userLimit || 0),
        branchLimit: Number(form.branchLimit || 0),
        warehouseLimit: Number(form.warehouseLimit || 0),
        moduleLimit: Number(form.moduleLimit || 0),
        mobileUserLimit: Number(form.mobileUserLimit || 0),
        allowedModules: splitCsv(form.allowedModules),
        subscription: {
          planKey: form.planKey,
          status: form.status === "suspended" ? "suspended" : form.status,
          userLimit: Number(form.userLimit || 0),
          branchLimit: Number(form.branchLimit || 0),
          warehouseLimit: Number(form.warehouseLimit || 0),
          moduleLimit: Number(form.moduleLimit || 0),
          mobileUserLimit: Number(form.mobileUserLimit || 0),
          allowedModules: splitCsv(form.allowedModules),
          expiresAt: form.expiresAt || undefined,
          notes: form.systemAdminNotes,
        },
      });
      setMessage("Saved");
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to save company control");
    } finally {
      setBusy(false);
    }
  }

  const userPercent = company.userLimit ? Math.min(100, Math.round((company.userCount / company.userLimit) * 100)) : 0;
  const statusTone = company.status === "active" ? "green" : company.status === "suspended" ? "red" : "amber";

  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-slate-950">{company.name || company.companyId}</h3>
          <Badge tone={statusTone}>{company.status || "active"}</Badge>
          <Badge tone="blue">{company.erpTemplateKey || "distribution_erp"}</Badge>
          <Badge tone="purple">{company.planKey || "starter"}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">Company ID: {company.companyId}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase text-slate-400">Users</p>
            <p className="text-lg font-black text-slate-950">{company.userCount}/{company.userLimit || "∞"}</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${userPercent}%` }} /></div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-400">Modules</p><p className="text-lg font-black text-slate-950">{company.moduleCount}/{company.moduleLimit || "∞"}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-400">Mobile</p><p className="text-lg font-black text-slate-950">{company.mobileUserCount || 0}/{company.mobileUserLimit || 0}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-400">Branches / WH</p><p className="text-lg font-black text-slate-950">{company.branchLimit || 0}/{company.warehouseLimit || 0}</p></div>
        </div>
      </div>
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <TextField label="Company name" value={form.name} onChange={(v) => setField("name", v)} />
      <TextField label="Email" value={form.email} onChange={(v) => setField("email", v)} />
      <TextField label="Phone" value={form.phone1} onChange={(v) => setField("phone1", v)} />
      <TextField label="WhatsApp" value={form.phone2} onChange={(v) => setField("phone2", v)} />
      <SelectField label="Plan" value={form.planKey} onChange={(v) => setField("planKey", v)} options={plans.map((plan) => ({ value: plan.key, label: plan.name }))} />
      <SelectField label="Status" value={form.status} onChange={(v) => setField("status", v)} options={["trial", "active", "inactive", "suspended", "expired", "cancelled"]} />
      <SelectField label="ERP Template" value={form.erpTemplateKey} onChange={(v) => setField("erpTemplateKey", v)} options={templates.map((t) => ({ value: t.key, label: t.name }))} />
      <TextField label="Expiry" type="date" value={form.expiresAt} onChange={(v) => setField("expiresAt", v)} />
      <TextField label="Users" type="number" value={form.userLimit} onChange={(v) => setField("userLimit", v)} />
      <TextField label="Branches" type="number" value={form.branchLimit} onChange={(v) => setField("branchLimit", v)} />
      <TextField label="Warehouses" type="number" value={form.warehouseLimit} onChange={(v) => setField("warehouseLimit", v)} />
      <TextField label="Mobile users" type="number" value={form.mobileUserLimit} onChange={(v) => setField("mobileUserLimit", v)} />
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <TextField label="Address" value={form.mainOfficeAddress} onChange={(v) => setField("mainOfficeAddress", v)} multiline />
      <TextField label="Admin notes / suspension reason" value={form.systemAdminNotes} onChange={(v) => setField("systemAdminNotes", v)} multiline />
    </div>
    <div className="mt-4"><ModulePicker modules={modules} value={form.allowedModules} onChange={(v) => setField("allowedModules", v)} /></div>
    <button onClick={save} disabled={busy} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Save Company Control"}</button>
    {message ? <span className="ml-3 text-sm font-bold text-emerald-700">{message}</span> : null}
    {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
  </div>;
}

function CompaniesPanel({ data, onReload }) {
  const [search, setSearch] = useState("");
  const plans = data?.plans || [];
  const modules = data?.modules || [];
  const templates = data?.templates || [];
  const companies = useMemo(() => {
    const rows = data?.companies || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((company) => [company.companyId, company.name, company.email, company.planKey, company.status].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [data, search]);

  return <div className="space-y-5">
    <CreateCompanyPanel data={data} onSaved={onReload} />
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Company Control</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Client Companies</h3>
          <p className="mt-1 text-sm text-slate-500">Manage activation, subscription, users, branches, warehouses, modules, and mobile limits.</p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, plan, status…" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
      </div>
    </div>
    {companies.length ? companies.map((company) => <CompanyControlRow key={company.companyId} company={company} plans={plans} modules={modules} templates={templates} onSaved={onReload} />) : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No matching companies found.</div>}
  </div>;
}

function PlansPanel({ data, onReload }) {
  const [form, setForm] = useState(DEFAULT_PLAN_FORM);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const plans = data?.plans || [];
  const modules = data?.modules || [];

  function setField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function editPlan(plan) {
    setForm({ ...DEFAULT_PLAN_FORM, ...plan, allowedModules: joinModules(plan.allowedModules || []) });
    setMessage(""); setError("");
  }
  async function savePlan() {
    setBusy(true); setMessage(""); setError("");
    try {
      await saveSubscriptionPlan({ ...form, monthlyPrice: Number(form.monthlyPrice || 0), userLimit: Number(form.userLimit || 0), branchLimit: Number(form.branchLimit || 0), warehouseLimit: Number(form.warehouseLimit || 0), moduleLimit: Number(form.moduleLimit || 0), mobileUserLimit: Number(form.mobileUserLimit || 0), allowedModules: splitCsv(form.allowedModules) });
      setMessage("Subscription plan saved");
      onReload?.();
    } catch (err) { setError(err.message || "Failed to save subscription plan"); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 xl:grid-cols-[0.9fr_1.2fr]">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Existing Plans</p>
      <div className="mt-4 space-y-3">
        {plans.map((plan) => <button key={plan.key} onClick={() => editPlan(plan)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50">
          <div className="flex items-center justify-between gap-3"><p className="font-black text-slate-950">{plan.name}</p><Badge tone={plan.status === "active" ? "green" : "slate"}>{plan.status || "active"}</Badge></div>
          <p className="mt-1 text-xs text-slate-500">Rs {plan.monthlyPrice || 0}/month · Users {plan.userLimit || 0} · Branches {plan.branchLimit || 0} · Warehouses {plan.warehouseLimit || 0} · Mobile {plan.mobileUserLimit || 0}</p>
        </button>)}
      </div>
    </div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Plan Builder</p>
      <h3 className="mt-2 text-2xl font-black text-slate-950">Create / Update Subscription Plan</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField label="Plan key" value={form.key} onChange={(v) => setField("key", v)} />
        <TextField label="Plan name" value={form.name} onChange={(v) => setField("name", v)} />
        <TextField label="Monthly price" type="number" value={form.monthlyPrice} onChange={(v) => setField("monthlyPrice", v)} />
        <TextField label="Users" type="number" value={form.userLimit} onChange={(v) => setField("userLimit", v)} />
        <TextField label="Branches" type="number" value={form.branchLimit} onChange={(v) => setField("branchLimit", v)} />
        <TextField label="Warehouses" type="number" value={form.warehouseLimit} onChange={(v) => setField("warehouseLimit", v)} />
        <TextField label="Modules" type="number" value={form.moduleLimit} onChange={(v) => setField("moduleLimit", v)} />
        <TextField label="Mobile users" type="number" value={form.mobileUserLimit} onChange={(v) => setField("mobileUserLimit", v)} />
        <SelectField label="Status" value={form.status} onChange={(v) => setField("status", v)} options={["active", "inactive"]} />
      </div>
      <div className="mt-4"><TextField label="Description" value={form.description} onChange={(v) => setField("description", v)} multiline /></div>
      <div className="mt-4"><ModulePicker modules={modules} value={form.allowedModules} onChange={(v) => setField("allowedModules", v)} /></div>
      <button onClick={savePlan} disabled={busy} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Save Plan"}</button>
      {message ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p> : null}
    </div>
  </div>;
}

function ModulesPanel({ data, onReload }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const modules = useMemo(() => {
    const rows = data?.modules || [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((module) => [module.key, module.name, module.category, module.path, module.status].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [data, search]);

  function startEdit(module) { setEditing({ ...module, actions: joinModules(module.actions || []), allowedErpTemplates: joinModules(module.allowedErpTemplates || []) }); setMessage(""); setError(""); }
  function setField(key, value) { setEditing((prev) => ({ ...(prev || {}), [key]: value })); }
  async function saveModule() {
    if (!editing?.key) return;
    setBusy(true); setMessage(""); setError("");
    try {
      await updateModuleControl(editing.key, { ...editing, order: Number(editing.order || 1000), actions: splitCsv(editing.actions), allowedErpTemplates: splitCsv(editing.allowedErpTemplates) });
      setMessage("Module control saved");
      setEditing(null);
      onReload?.();
    } catch (err) { setError(err.message || "Failed to save module"); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Module Registry</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Web & Mobile Module Controls</h3>
          <p className="mt-1 text-sm text-slate-500">Activate modules, control web/mobile availability, sort order, categories, and ERP template availability.</p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search modules…" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400"><th className="py-3 pr-4">Module</th><th className="py-3 pr-4">Category</th><th className="py-3 pr-4">Web</th><th className="py-3 pr-4">Mobile</th><th className="py-3 pr-4">Status</th><th className="py-3">Action</th></tr></thead>
          <tbody>
            {modules.map((module) => <tr key={module.key} className="border-b border-slate-100"><td className="py-3 pr-4"><p className="font-black text-slate-950">{module.name}</p><p className="text-xs text-slate-500">{module.key}</p></td><td className="py-3 pr-4 text-slate-600">{module.category}</td><td className="py-3 pr-4"><Badge tone={module.webEnabled ? "green" : "slate"}>{module.webEnabled ? "Yes" : "No"}</Badge></td><td className="py-3 pr-4"><Badge tone={module.mobileEnabled ? "green" : "slate"}>{module.mobileEnabled ? "Yes" : "No"}</Badge></td><td className="py-3 pr-4"><Badge tone={module.status === "active" ? "green" : "red"}>{module.status}</Badge></td><td className="py-3"><button onClick={() => startEdit(module)} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">Edit</button></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Module Editor</p>
      {editing ? <div className="mt-4 space-y-4">
        <TextField label="Key" value={editing.key} onChange={(v) => setField("key", v)} />
        <TextField label="Name" value={editing.name} onChange={(v) => setField("name", v)} />
        <TextField label="Category" value={editing.category} onChange={(v) => setField("category", v)} />
        <TextField label="Path" value={editing.path} onChange={(v) => setField("path", v)} />
        <TextField label="Order" type="number" value={editing.order} onChange={(v) => setField("order", v)} />
        <SelectField label="Status" value={editing.status} onChange={(v) => setField("status", v)} options={["active", "inactive"]} />
        <ToggleField label="Enable on web" checked={editing.webEnabled} onChange={(v) => setField("webEnabled", v)} />
        <ToggleField label="Enable on mobile" checked={editing.mobileEnabled} onChange={(v) => setField("mobileEnabled", v)} />
        <TextField label="Actions" value={editing.actions} onChange={(v) => setField("actions", v)} placeholder="view,create,edit,delete,approve" />
        <TextField label="ERP templates" value={editing.allowedErpTemplates} onChange={(v) => setField("allowedErpTemplates", v)} placeholder="distribution_erp,manufacturing_erp" />
        <TextField label="Description" value={editing.description} onChange={(v) => setField("description", v)} multiline />
        <button onClick={saveModule} disabled={busy} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Save Module"}</button>
      </div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Select any module from the list to edit its availability, order, or template support.</p>}
      {message ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p> : null}
    </div>
  </div>;
}

function OverviewPanel({ data, onReload }) {
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Companies" value={data?.stats?.companies} helper={`${data?.stats?.activeCompanies || 0} active, ${data?.stats?.trialCompanies || 0} trial`} />
      <StatCard label="Users" value={data?.stats?.users} helper={`${data?.stats?.mobileUsers || 0} mobile-enabled users`} />
      <StatCard label="Modules" value={data?.stats?.activeModules} helper={`${data?.stats?.mobileModules || 0} mobile modules`} />
      <StatCard label="Plans" value={data?.stats?.plans} helper={`${data?.stats?.templates || 0} ERP templates`} />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <CompaniesPanel data={data} onReload={onReload} />
      <div className="space-y-5">
        <PlansPanel data={data} onReload={onReload} />
        <ModulesPanel data={data} onReload={onReload} />
      </div>
    </div>
  </div>;
}

export default function SystemAdminPortalPage({ mode = "system-admin" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchSystemAdminOverview();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load SaaS control center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function seed() {
    setMessage(""); setError("");
    try {
      const result = await seedSystemAdminDefaults();
      setMessage(result.message || "Defaults seeded");
      await load();
    } catch (err) { setError(err.message || "Failed to seed defaults"); }
  }

  const activeMode = mode === "system-admin-companies" ? "companies" : mode === "subscription-plans" ? "plans" : mode === "module-controls" ? "modules" : "overview";

  return <div className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">SaaS Control Center</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Rawyan ERP System Admin</h2>
          <p className="mt-2 max-w-4xl text-sm text-slate-600">Manage client companies, ERP templates, subscriptions, module access, tenant limits, system users, and SaaS onboarding from one production-ready owner portal.</p>
        </div>
        <button onClick={seed} className="rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm">Seed / Repair Defaults</button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {["overview", "companies", "plans", "modules"].map((item) => <span key={item} className={`rounded-full px-4 py-2 text-xs font-black uppercase ${activeMode === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{item}</span>)}
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p> : null}
    </div>

    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading SaaS control center…</div> : null}
    {!loading && activeMode === "overview" ? <OverviewPanel data={data} onReload={load} /> : null}
    {!loading && activeMode === "companies" ? <CompaniesPanel data={data} onReload={load} /> : null}
    {!loading && activeMode === "plans" ? <PlansPanel data={data} onReload={load} /> : null}
    {!loading && activeMode === "modules" ? <ModulesPanel data={data} onReload={load} /> : null}
  </div>;
}
