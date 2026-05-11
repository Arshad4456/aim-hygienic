"use client";
import { useEffect, useState } from "react";
import UsersAccessPage from "@/src/app/modules/platform/users/pages/UsersAccessPage";
import { createSystemAdminUser, fetchSystemAdminOverview } from "@/src/app/modules/platform/system-admin/services/systemAdminService";

export default function SystemAdminUsersPage() {
  const [companies, setCompanies] = useState([]);
  const [adminForm, setAdminForm] = useState({ fullName: "", username: "", mobile: "", email: "", password: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadCompanies() {
    try { const payload = await fetchSystemAdminOverview(); setCompanies(payload.companies || []); } catch (_) { setCompanies([]); }
  }
  useEffect(() => { loadCompanies(); }, []);

  function setField(key, value) { setAdminForm((prev) => ({ ...prev, [key]: value })); }
  async function createAdmin() {
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = await createSystemAdminUser(adminForm);
      setNotice(`${payload?.user?.fullName || "System Admin"} created. They can login at /login and land on /portals/system-admin.`);
      setAdminForm({ fullName: "", username: "", mobile: "", email: "", password: "" });
    } catch (err) { setError(err.message || "Unable to create system admin"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-emerald-700 to-cyan-500 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">System Admin Users</p>
      <h2 className="mt-2 text-3xl font-black">Create SaaS Owner & Company Users</h2>
      <p className="mt-2 max-w-4xl text-sm text-cyan-50">Use this screen to create additional Rawyan ERP system admins and company users. Company users can also be managed by Company Admin from /portals/users.</p>
    </div>

    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">Create Another System Admin</h3>
      <p className="mt-1 text-sm text-slate-500">System Admin has SaaS-owner access: companies, templates, subscriptions, modules, users, and reports across Rawyan ERP.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input value={adminForm.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Full name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={adminForm.username} onChange={(e) => setField("username", e.target.value)} placeholder="Username" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={adminForm.mobile} onChange={(e) => setField("mobile", e.target.value)} placeholder="Mobile" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={adminForm.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
        <input value={adminForm.password} onChange={(e) => setField("password", e.target.value)} placeholder="Initial password" type="password" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
      </div>
      <button onClick={createAdmin} disabled={busy} className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "Creating…" : "Create System Admin"}</button>
      {notice ? <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p> : null}
    </div>

    <UsersAccessPage companyOptions={companies} systemMode />
  </div>;
}
