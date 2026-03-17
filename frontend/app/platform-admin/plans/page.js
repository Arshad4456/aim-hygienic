"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', billingType: 'monthly', monthlyPrice: 0, yearlyPrice: 0, maxUsers: 50, maxWarehouses: 5, maxVehicles: 10, includedModules: 'territory_assets,hr_role_management,order_management' });
  const [message, setMessage] = useState('');

  async function loadPlans() {
    try {
      const data = await apiFetch('/platform-admin/plans');
      setPlans(data.plans || []);
    } catch (error) {
      setMessage(error?.message || 'Failed to load plans');
    }
  }

  useEffect(() => { loadPlans().catch(() => undefined); }, []);

  async function createPlan(e) {
    e.preventDefault();
    try {
      await apiFetch('/platform-admin/plans', {
        method: 'POST',
        body: {
          ...form,
          includedModules: String(form.includedModules || '').split(',').map((v) => v.trim()).filter(Boolean),
          includedFeatures: ['runtime_dashboards', 'document_templates', 'mobile_access'],
        },
      });
      setMessage('Plan created successfully.');
      setForm({ name: '', code: '', billingType: 'monthly', monthlyPrice: 0, yearlyPrice: 0, maxUsers: 50, maxWarehouses: 5, maxVehicles: 10, includedModules: 'territory_assets,hr_role_management,order_management' });
      await loadPlans();
    } catch (error) {
      setMessage(error?.message || 'Failed to create plan');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Plans & Subscriptions</h1>
          <p className="mt-2 text-zinc-600">Create module packages and commercial plans that companies can subscribe to.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form onSubmit={createPlan} className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
            <div className="text-lg font-semibold text-zinc-900">Add Plan</div>
            <input className="w-full rounded-xl border px-3 py-2" placeholder="Plan name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="w-full rounded-xl border px-3 py-2" placeholder="plan_code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required />
            <select className="w-full rounded-xl border px-3 py-2" value={form.billingType} onChange={(e) => setForm((p) => ({ ...p, billingType: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Monthly price" value={form.monthlyPrice} onChange={(e) => setForm((p) => ({ ...p, monthlyPrice: Number(e.target.value) }))} />
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Yearly price" value={form.yearlyPrice} onChange={(e) => setForm((p) => ({ ...p, yearlyPrice: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Max users" value={form.maxUsers} onChange={(e) => setForm((p) => ({ ...p, maxUsers: Number(e.target.value) }))} />
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Max warehouses" value={form.maxWarehouses} onChange={(e) => setForm((p) => ({ ...p, maxWarehouses: Number(e.target.value) }))} />
              <input type="number" className="rounded-xl border px-3 py-2" placeholder="Max vehicles" value={form.maxVehicles} onChange={(e) => setForm((p) => ({ ...p, maxVehicles: Number(e.target.value) }))} />
            </div>
            <textarea className="w-full rounded-xl border px-3 py-2" rows={4} placeholder="included module codes, comma separated" value={form.includedModules} onChange={(e) => setForm((p) => ({ ...p, includedModules: e.target.value }))} />
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create Plan</button>
            {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
          </form>
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Available Plans</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <div key={plan._id} className="rounded-2xl border p-4">
                  <div className="font-medium text-zinc-900">{plan.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">{plan.code} • {plan.billingType}</div>
                  <div className="mt-2 text-sm text-zinc-600">Modules: {(plan.includedModules || []).join(', ') || 'None'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
