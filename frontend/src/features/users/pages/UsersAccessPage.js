"use client";
import { useEffect, useMemo, useState } from "react";
import userAccessService from "../../../services/userAccessService";
import roleService from "../../../services/roleService";

function userName(user) { return user?.fullName || user?.username || user?.mobile || "User"; }
function userId(user) { return user?._id || user?.id || user?.userId; }

export default function UsersAccessPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    try {
      const [userPayload, rolePayload] = await Promise.all([userAccessService.listUsers({ search, role: roleFilter, status: statusFilter }), roleService.options()]);
      setUsers(userPayload.users || []);
      setRoles(rolePayload.roles || []);
    } catch (e) { setError(e.message || "Unable to load users"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const roleOptions = useMemo(() => roles.filter((role) => role.status !== "inactive"), [roles]);

  async function assignRole(user, roleId) {
    const id = userId(user); if (!id || !roleId) return;
    setBusyId(id); setError(""); setNotice("");
    try { await userAccessService.assignRole(id, roleId); setNotice(`Role updated for ${userName(user)}.`); await load(); }
    catch (e) { setError(e.message || "Unable to assign role"); }
    finally { setBusyId(""); }
  }
  async function setStatus(user, status) {
    const id = userId(user); if (!id || !status) return;
    setBusyId(id); setError(""); setNotice("");
    try { await userAccessService.setStatus(id, status); setNotice(`Status updated for ${userName(user)}.`); await load(); }
    catch (e) { setError(e.message || "Unable to update status"); }
    finally { setBusyId(""); }
  }

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Phase 2 User Access</p><h2 className="text-2xl font-black text-slate-950">Users, Roles & Portal Access</h2><p className="text-sm text-slate-500">Assign roles, lock users, and control web/mobile portal access from one place.</p></div>
      <div className="flex flex-wrap gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All roles</option>{roleOptions.map((role) => <option key={role._id} value={role.name}>{role.name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="deactive">Deactive</option></select><button onClick={load} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Apply</button></div>
    </div>
    {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}{notice ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">User</th><th className="p-4">Current Role</th><th className="p-4">Company / Scope</th><th className="p-4">Assign Role</th><th className="p-4">Status</th><th className="p-4">Mobile</th></tr></thead><tbody>{loading ? <tr><td className="p-4 text-slate-500" colSpan={6}>Loading users…</td></tr> : users.map((user) => { const id = userId(user); return <tr key={id} className="border-t border-slate-100"><td className="p-4"><p className="font-black text-slate-950">{userName(user)}</p><p className="text-xs text-slate-500">{user.mobile || user.mobileNumber || user.email || user.userId}</p></td><td className="p-4"><p className="font-bold text-slate-800">{user.roleName || user.role}</p><p className="text-xs text-slate-500">{user.portalType || "company_user"}</p></td><td className="p-4 text-slate-600"><p>{user.companyName || user.companyId || "System"}</p><p className="text-xs text-slate-500">{user.regionName || user.territoryName || user.warehouseName || "All assigned scope"}</p></td><td className="p-4"><select disabled={busyId === id} value={user.roleId || ""} onChange={(e) => assignRole(user, e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select role</option>{roleOptions.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}</select></td><td className="p-4"><select disabled={busyId === id} value={user.status || "active"} onChange={(e) => setStatus(user, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="deactive">Deactive</option></select></td><td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.mobileAccess ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.mobileAccess ? "Enabled" : "Disabled"}</span></td></tr>; })}</tbody></table></div></div>
  </div>;
}
