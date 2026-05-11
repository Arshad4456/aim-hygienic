"use client";
import { useEffect, useMemo, useState } from "react";
import userAccessService from "@/src/services/userAccessService";
import roleService from "@/src/services/roleService";
import { ERP_TYPES, normalizeErpType } from "@/src/config/erpAccessMatrix";

function userName(user) { return user?.fullName || user?.username || user?.mobile || "User"; }
function userId(user) { return user?._id || user?.id || user?.userId; }

const emptyForm = { fullName: "", username: "", mobile: "", email: "", password: "", roleId: "", companyId: "", companyName: "", erpTemplateKey: "distribution_erp", mobileAccess: false };

export default function UsersAccessPage({ companyOptions = [], systemMode = false }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const selectedCompany = useMemo(() => companyOptions.find((c) => String(c.companyId) === String(form.companyId)), [companyOptions, form.companyId]);

  async function load() {
    setLoading(true); setError("");
    try {
      const roleQuery = { companyId: systemMode ? form.companyId : undefined, erpTemplateKey: form.erpTemplateKey };
      const [userPayload, rolePayload] = await Promise.all([userAccessService.listUsers({ search, role: roleFilter, status: statusFilter, companyId: systemMode ? form.companyId : undefined }), roleService.options(roleQuery)]);
      setUsers(userPayload.users || []);
      setRoles(rolePayload.roles || []);
    } catch (e) { setError(e.message || "Unable to load users"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { roleService.options({ companyId: systemMode ? form.companyId : undefined, erpTemplateKey: form.erpTemplateKey }).then((payload) => setRoles(payload.roles || [])).catch(() => {}); }, [form.companyId, form.erpTemplateKey, systemMode]);
  const roleOptions = useMemo(() => roles.filter((role) => role.status !== "inactive" && (!form.erpTemplateKey || !role.erpTemplateKey || role.erpTemplateKey === normalizeErpType(form.erpTemplateKey) || role.isSystemRole)), [roles, form.erpTemplateKey]);

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "companyId") {
        const company = companyOptions.find((c) => String(c.companyId) === String(value));
        next.companyName = company?.name || "";
        next.erpTemplateKey = company?.erpTemplateKey || company?.businessType || next.erpTemplateKey || "distribution_erp";
        next.roleId = "";
      }
      if (key === "erpTemplateKey") next.roleId = "";
      return next;
    });
  }
  async function createUser() {
    setBusyId("create"); setError(""); setNotice("");
    try {
      const payload = { ...form, companyName: form.companyName || selectedCompany?.name || "", erpTemplateKey: form.erpTemplateKey || selectedCompany?.erpTemplateKey || selectedCompany?.businessType || "distribution_erp" };
      const result = await userAccessService.createUser(payload);
      setNotice(`${result?.user?.fullName || "User"} created successfully.`);
      setForm(emptyForm); setShowCreate(false); await load();
    } catch (e) { setError(e.message || "Unable to create user"); }
    finally { setBusyId(""); }
  }
  async function assignRole(user, roleId) { const id = userId(user); if (!id || !roleId) return; setBusyId(id); setError(""); setNotice(""); try { await userAccessService.assignRole(id, roleId); setNotice(`Role updated for ${userName(user)}.`); await load(); } catch (e) { setError(e.message || "Unable to assign role"); } finally { setBusyId(""); } }
  async function setStatus(user, status) { const id = userId(user); if (!id || !status) return; setBusyId(id); setError(""); setNotice(""); try { await userAccessService.setStatus(id, status); setNotice(`Status updated for ${userName(user)}.`); await load(); } catch (e) { setError(e.message || "Unable to update status"); } finally { setBusyId(""); } }

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Phase 13 User Creation</p><h2 className="text-2xl font-black text-slate-950">Users, Roles & Portal Access</h2><p className="text-sm text-slate-500">System Admin creates system/company admins. Company Admin creates company users. Distributor can create sales/order/customer users inside assigned scope.</p></div>
      <div className="flex flex-wrap gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All roles</option>{roleOptions.map((role) => <option key={role._id} value={role.name}>{role.name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="deactive">Deactive</option></select><button onClick={load} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Apply</button><button onClick={() => setShowCreate((v) => !v)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">{showCreate ? "Close" : "Create User"}</button></div>
    </div>

    {showCreate ? <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">Create User</h3>
      <p className="mt-1 text-sm text-slate-500">System Admin must select a client company first; ERP type loads from that company and roles are filtered by that ERP. Company Admin creates users only inside their own company and plan limits.</p>{selectedCompany ? <p className="mt-2 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">Selected company: {selectedCompany.name || selectedCompany.companyId} · Plan: {selectedCompany.subscription?.planKey || selectedCompany.planKey || "active"} · Users: {selectedCompany.usage?.users ?? selectedCompany.userCount ?? 0}/{selectedCompany.subscription?.userLimit || selectedCompany.userLimit || "∞"} · Warehouses: {selectedCompany.usage?.warehouses ?? 0}/{selectedCompany.subscription?.warehouseLimit || selectedCompany.warehouseLimit || "∞"}</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Full name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={form.username} onChange={(e) => updateField("username", e.target.value)} placeholder="Username" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={form.mobile} onChange={(e) => updateField("mobile", e.target.value)} placeholder="Mobile" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Initial password" type="password" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <select value={form.roleId} onChange={(e) => updateField("roleId", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="">Select role</option>{roleOptions.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}</select>
        {companyOptions.length ? <select value={form.companyId} onChange={(e) => updateField("companyId", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="">System-level user / no company</option>{companyOptions.map((company) => <option key={company.companyId} value={company.companyId}>{company.name || company.companyId} — {company.erpTemplateKey || company.businessType || "distribution_erp"}</option>)}</select> : <input value={form.companyId} onChange={(e) => updateField("companyId", e.target.value)} placeholder="Company ID (auto for company admins)" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />}
        <select value={form.erpTemplateKey} onChange={(e) => updateField("erpTemplateKey", e.target.value)} disabled={Boolean(selectedCompany?.erpTemplateKey || selectedCompany?.businessType)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">{ERP_TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.mobileAccess} onChange={(e) => updateField("mobileAccess", e.target.checked)} /> Mobile access</label>
      </div>
      <button onClick={createUser} disabled={busyId === "create"} className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busyId === "create" ? "Creating…" : "Create User"}</button>
    </div> : null}

    {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}{notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Current Role</th><th className="p-4">Company / Scope</th><th className="p-4">Assign Role</th><th className="p-4">Status</th><th className="p-4">Mobile</th></tr></thead><tbody>{loading ? <tr><td className="p-4 text-slate-500" colSpan={6}>Loading users…</td></tr> : users.map((user) => { const id = userId(user); return <tr key={id} className="border-t border-slate-100"><td className="p-4"><p className="font-black text-slate-950">{userName(user)}</p><p className="text-xs text-slate-500">{user.mobile || user.mobileNumber || user.email || user.userId}</p></td><td className="p-4"><p className="font-bold text-slate-800">{user.roleName || user.role}</p><p className="text-xs text-slate-500">{user.portalType || "company_user"}</p></td><td className="p-4 text-slate-600"><p>{user.companyName || user.companyId || "System"}</p><p className="text-xs text-slate-500">{user.erpTemplateKey || "company ERP"} · {user.regionName || user.territoryName || user.warehouseName || "All assigned scope"}</p></td><td className="p-4"><select disabled={busyId === id} value={user.roleId || ""} onChange={(e) => assignRole(user, e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select role</option>{roleOptions.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}</select></td><td className="p-4"><select disabled={busyId === id} value={user.status || "active"} onChange={(e) => setStatus(user, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="deactive">Deactive</option></select></td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.mobileAccess ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.mobileAccess ? "Enabled" : "Disabled"}</span></td></tr>; })}{!loading && !users.length ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">No users found.</td></tr> : null}</tbody></table></div></div>
  </div>;
}
