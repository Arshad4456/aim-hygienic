"use client";
import { useEffect, useMemo, useState } from "react";
import roleService from "../../../services/roleService";
import portalModuleService from "../../../services/portalModuleService";
import { ACTION_LABELS, PERMISSION_ACTIONS } from "../../../config/permissionActions";

const DEFAULT_FORM = { name: "", description: "", portalType: "company_user", landingPath: "/portals", status: "active", mobileAccess: false, permissions: {} };
const SCOPE_OPTIONS = ["all", "company", "branch", "warehouse", "territory", "own"];
function entryActions(entry) { return Array.isArray(entry?.actions) ? entry.actions : []; }
function rolePermissions(role) { return role?.permissions && typeof role.permissions === "object" ? role.permissions : {}; }

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [rolePayload, modulePayload] = await Promise.all([roleService.list({ withUserCount: true }), portalModuleService.list({ webEnabled: true })]);
      setRoles(rolePayload.roles || []);
      setModules(modulePayload.modules || []);
    } catch (e) { setError(e.message || "Unable to load role setup"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const activeModuleKeys = useMemo(() => Object.keys(form.permissions || {}).filter((key) => entryActions(form.permissions[key]).length), [form.permissions]);
  function startCreate() { setSelectedRole(null); setForm(DEFAULT_FORM); setNotice(""); }
  function startEdit(role) { setSelectedRole(role); setForm({ name: role.name || "", description: role.description || "", portalType: role.portalType || "company_user", landingPath: role.landingPath || "/portals", status: role.status || "active", mobileAccess: Boolean(role.mobileAccess), permissions: rolePermissions(role), mobileModules: role.mobileModules || [] }); setNotice(""); }
  function toggleAction(moduleKey, action) {
    setForm((current) => {
      const permissions = { ...(current.permissions || {}) };
      const entry = permissions[moduleKey] || { actions: [], scope: "company" };
      const actions = new Set(entryActions(entry));
      actions.has(action) ? actions.delete(action) : actions.add(action);
      if (!actions.size) delete permissions[moduleKey];
      else permissions[moduleKey] = { ...entry, actions: Array.from(actions), scope: entry.scope || "company" };
      return { ...current, permissions };
    });
  }
  function setScope(moduleKey, scope) { setForm((current) => ({ ...current, permissions: { ...(current.permissions || {}), [moduleKey]: { ...(current.permissions?.[moduleKey] || { actions: ["view"] }), scope } } })); }
  async function saveRole() {
    setSaving(true); setError(""); setNotice("");
    try {
      const enabledModules = activeModuleKeys;
      const payload = { ...form, enabledModules, mobileModules: form.mobileAccess ? enabledModules.filter((key) => modules.find((m) => m.key === key)?.mobileEnabled || ["dashboard", "customers", "receipts", "deliveries", "live-tracking"].includes(key)) : [] };
      if (selectedRole?._id) await roleService.update(selectedRole._id, payload); else await roleService.create(payload);
      setNotice("Role saved successfully."); await load();
    } catch (e) { setError(e.message || "Unable to save role"); }
    finally { setSaving(false); }
  }
  async function seedDefaults() { setSaving(true); setError(""); try { await roleService.seedDefaults(); setNotice("Default ERP roles created/updated."); await load(); } catch (e) { setError(e.message || "Unable to seed roles"); } finally { setSaving(false); } }

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Phase 2 Access Control</p><h2 className="text-2xl font-black text-slate-950">Roles & Permissions</h2><p className="text-sm text-slate-500">Create ERP roles and assign module-level actions for web and mobile portals.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={seedDefaults} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Seed defaults</button><button onClick={startCreate} className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow">New Role</button></div>
    </div>
    {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}{notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">Existing Roles</h3><p className="text-xs text-slate-500">{loading ? "Loading…" : `${roles.length} roles available`}</p></div><div className="max-h-[700px] overflow-auto">{roles.map((role) => <button key={role._id} onClick={() => startEdit(role)} className={`block w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 ${selectedRole?._id === role._id ? "bg-emerald-50" : "bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-950">{role.name}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{role.status}</span></div><p className="mt-1 text-xs text-slate-500">{role.portalType} · {role.enabledModules?.length || Object.keys(role.permissions || {}).length} modules</p>{role.isSystemRole ? <p className="mt-1 text-[11px] font-bold text-emerald-700">System role</p> : null}</button>)}</div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">Role name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" placeholder="Area Sales Manager" /></label><label className="text-sm font-bold text-slate-700">Portal type<input value={form.portalType} onChange={(e) => setForm({ ...form, portalType: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" placeholder="area_sales_manager" /></label><label className="text-sm font-bold text-slate-700">Landing path<input value={form.landingPath} onChange={(e) => setForm({ ...form, landingPath: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" placeholder="/portals" /></label><label className="text-sm font-bold text-slate-700">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><label className="mt-3 block text-sm font-bold text-slate-700">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" rows={2} /></label><label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.mobileAccess} onChange={(e) => setForm({ ...form, mobileAccess: e.target.checked })} />Allow mobile app access</label>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-[1.3fr_1fr_2fr] bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500"><span>Module</span><span>Scope</span><span>Actions</span></div><div className="max-h-[500px] overflow-auto">{modules.map((module) => { const entry = form.permissions?.[module.key] || {}; return <div key={module.key} className="grid grid-cols-[1.3fr_1fr_2fr] items-start gap-3 border-t border-slate-100 px-3 py-3"><div><p className="font-bold text-slate-900">{module.name}</p><p className="text-xs text-slate-500">{module.category}</p></div><select value={entry.scope || "company"} onChange={(e) => setScope(module.key, e.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm">{SCOPE_OPTIONS.map((scope) => <option key={scope} value={scope}>{scope}</option>)}</select><div className="flex flex-wrap gap-1">{PERMISSION_ACTIONS.map((action) => <button key={action} type="button" onClick={() => toggleAction(module.key, action)} className={`rounded-full px-2 py-1 text-[11px] font-bold ${entryActions(entry).includes(action) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{ACTION_LABELS[action] || action}</button>)}</div></div>; })}</div></div><div className="mt-5 flex justify-end"><button onClick={saveRole} disabled={saving || !form.name} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Saving…" : selectedRole ? "Update Role" : "Create Role"}</button></div></div>
    </div>
  </div>;
}
