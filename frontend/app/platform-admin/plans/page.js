"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch('/platform-admin/plans')
      .then((data) => setPlans(data.plans || []))
      .catch((e) => setError(e.message || 'Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">Plans &amp; Subscriptions</h1>
          <p className="text-zinc-600 mt-2">Review subscription plans, module packages, and lifecycle controls.</p>
        </div>
        {loading ? <div className="text-sm text-zinc-600">Loading plans...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan._id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-zinc-900">{plan.name}</div>
                {plan.isDefault ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Default</span> : null}
              </div>
              <div className="text-sm text-zinc-500 mt-1">{plan.code}</div>
              <div className="text-sm text-zinc-600 mt-3">{plan.description || 'No description added.'}</div>
              <div className="mt-4 text-sm text-zinc-700 space-y-1">
                <div>Billing: {plan.billingType || 'custom'}</div>
                <div>Users limit: {plan.maxUsers || 0}</div>
                <div>Warehouses limit: {plan.maxWarehouses || 0}</div>
                <div>Vehicles limit: {plan.maxVehicles || 0}</div>
                <div>Modules: {(plan.includedModules || []).length}</div>
              </div>
            </div>
          ))}
          {!loading && !error && plans.length === 0 ? <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">No plans available yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
