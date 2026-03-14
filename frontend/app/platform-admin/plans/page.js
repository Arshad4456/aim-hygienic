"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

const EMPTY_PLAN = { name: "", code: "", description: "", billingType: "monthly", monthlyPrice: 0, yearlyPrice: 0, maxUsers: 0, maxWarehouses: 0, maxVehicles: 0, includedModules: "", includedFeatures: "", status: "active", isDefault: false };

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await apiFetch("/platform-admin/plans");
      setPlans(data.plans || []);
    } catch (err) {
      setError(err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadPlans().catch(() => undefined); }, []);
  const canSubmit = useMemo(() => form.name.trim() && form.code.trim(), [form]);

  async function createPlan(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch("/platform-admin/plans", {
        method: "POST",
        body: {
          ...form,
          includedModules: String(form.includedModules || "").split(",").map((v) => v.trim()).filter(Boolean),
          includedFeatures: String(form.includedFeatures || "").split(",").map((v) => v.trim()).filter(Boolean),
        },
      });
      setForm(EMPTY_PLAN);
      setShowForm(false);
      await loadPlans();
    } catch (err) {
      setError(err.message || "Failed to create plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
              <h1 className="text-2xl font-bold text-zinc-900 mt-2">Plans & Subscriptions</h1>
              <p className="text-zinc-600 mt-2">Review subscription plans, module packages, lifecycle controls, and commercial packaging.</p>
            </div>
            <button onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{showForm ? "Close" : "Add Plan"}</button>
          </div>
          {showForm ? (
            <form onSubmit={createPlan} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ["name", "Plan Name"], ["code", "Plan Code"], ["description", "Description"], ["billingType", "Billing Type"], ["monthlyPrice", "Monthly Price"], ["yearlyPrice", "Yearly Price"], ["maxUsers", "Max Users"], ["maxWarehouses", "Max Warehouses"], ["maxVehicles", "Max Vehicles"], ["includedModules", "Included Modules (comma separated)"], ["includedFeatures", "Included Features (comma separated)"]
              ].map(([key, label]) => (
                <label key={key} className="text-sm">
                  <div className="mb-1 font-medium">{label}</div>
                  {key === "billingType" ? (
                    <select value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-xl border px-3 py-2">
                      <option value="monthly">monthly</option><option value="yearly">yearly</option><option value="custom">custom</option>
                    </select>
                  ) : (
                    <input value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-xl border px-3 py-2" />
                  )}
                </label>
              ))}
              <div className="md:col-span-2 flex justify-end"><button disabled={!canSubmit || saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Create Plan"}</button></div>
            </form>
          ) : null}
        </div>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="rounded-2xl border bg-white p-6 text-sm">Loading plans...</div> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan._id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between gap-4"><div className="text-lg font-semibold">{plan.name}</div>{plan.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Default</span> : null}</div>
              <div className="mt-1 text-sm text-zinc-500">{plan.code} • {plan.billingType}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-700">
                <div>Monthly: {plan.monthlyPrice || 0}</div><div>Yearly: {plan.yearlyPrice || 0}</div><div>Users: {plan.maxUsers || 0}</div><div>Warehouses: {plan.maxWarehouses || 0}</div><div>Vehicles: {plan.maxVehicles || 0}</div><div>Status: {plan.status || "active"}</div>
              </div>
              <div className="mt-4 text-xs text-zinc-600">Modules: {(plan.includedModules || []).join(", ") || "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
