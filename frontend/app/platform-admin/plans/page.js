"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

const EMPTY = { name: '', code: '', description: '', billingType: 'monthly', monthlyPrice: 0, yearlyPrice: 0, maxUsers: 50, maxWarehouses: 5, maxVehicles: 10, includedModules: [] };

export default function Page() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  async function load() {
    const data = await apiFetch('/platform-admin/plans');
    setPlans(data.plans || []);
  }
  useEffect(() => { load().catch((e) => setError(e.message || 'Failed to load plans')); }, []);

  async function save(e) {
    e.preventDefault(); setError('');
    try {
      await apiFetch('/platform-admin/plans', { method: 'POST', body: form });
      setForm(EMPTY); await load();
    } catch (e2) { setError(e2.message || 'Failed to create plan'); }
  }

  return <div className="min-h-screen bg-zinc-50 p-6 md:p-8"><div className="max-w-6xl mx-auto space-y-6"><div className="rounded-2xl border bg-white p-6"><div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div><h1 className="text-2xl font-bold text-zinc-900 mt-2">Plans & Subscriptions</h1><p className="text-zinc-600 mt-2">Review subscription plans, module packages, and lifecycle controls.</p></div>{error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}<form onSubmit={save} className="rounded-2xl border bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-4"><input className="rounded-xl border px-3 py-2" placeholder="Plan name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required /><input className="rounded-xl border px-3 py-2" placeholder="code" value={form.code} onChange={(e)=>setForm({...form,code:e.target.value.toLowerCase().replace(/[^a-z0-9_\-]+/g,'-')})} required /><select className="rounded-xl border px-3 py-2" value={form.billingType} onChange={(e)=>setForm({...form,billingType:e.target.value})}><option value="monthly">monthly</option><option value="yearly">yearly</option><option value="custom">custom</option></select><input className="rounded-xl border px-3 py-2" placeholder="Monthly price" type="number" value={form.monthlyPrice} onChange={(e)=>setForm({...form,monthlyPrice:Number(e.target.value)})} /><textarea className="rounded-xl border px-3 py-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /><div className="md:col-span-2 flex justify-end"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold">Create Plan</button></div></form><div className="grid gap-4">{plans.map((plan)=><div key={plan._id} className="rounded-2xl border bg-white p-5"><div className="font-semibold">{plan.name}</div><div className="text-sm text-zinc-500 mt-1">{plan.code} · {plan.billingType}</div><div className="text-sm mt-2">Users: {plan.maxUsers} · Warehouses: {plan.maxWarehouses} · Vehicles: {plan.maxVehicles}</div></div>)}</div></div></div>;
}
