"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "../../../../lib/api";

export default function CompanyAnalyticsDetailPage() {
  const params = useParams();
  const companyId = params?.companyId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/platform-admin/analytics/companies/${companyId}`);
        if (!mounted) return;
        setDetail(data);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load company analytics detail");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  if (loading) return <div className="p-6 text-sm">Loading company analytics...</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold">Failed to load company analytics</div>
          <div className="text-sm text-zinc-600 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  const company = detail?.company || {};
  const subscription = detail?.subscription || {};
  const onboarding = detail?.onboarding || {};
  const counts = detail?.counts || {};
  const limitComparison = detail?.limitComparison?.limits || {};
  const snapshots = detail?.snapshots || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{company.name || "Company"} Usage Analytics</h1>
          <p className="text-sm text-zinc-600">Lifecycle: {company.lifecycleStatus || "inactive"}</p>
        </div>
        <Link href="/platform-admin/analytics" className="rounded border px-3 py-2 text-sm">Back to analytics</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4 space-y-1 text-sm">
          <div className="font-semibold mb-2">Subscription</div>
          <div>Plan: {subscription.planName || subscription.planCode || "-"}</div>
          <div>Status: {subscription.status || "pending"}</div>
          <div>Payment Status: {subscription.paymentStatus || "pending"}</div>
          <div>Billing: {subscription.billingCycle || "-"}</div>
          <div>Period: {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : "-"} → {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : "-"}</div>
        </div>

        <div className="rounded-xl border bg-white p-4 space-y-1 text-sm">
          <div className="font-semibold mb-2">Onboarding</div>
          <div>Completed: {onboarding.completed ? "Yes" : "No"}</div>
          <div>Current Step: {onboarding?.state?.currentStep || "-"}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-3">Usage Counts</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>Users: {counts.userCount || 0}</div>
          <div>Active Users: {counts.activeUserCount || 0}</div>
          <div>Warehouses: {counts.warehouseCount || 0}</div>
          <div>Vehicles: {counts.vehicleCount || 0}</div>
          <div>Modules: {counts.assignedModuleCount || 0}</div>
          <div>Roles: {counts.activeRoleCount || 0}</div>
          <div>Dashboards: {counts.activeDashboardCount || 0}</div>
          <div>Doc Templates: {counts.documentTemplateCount || 0}</div>
          <div>Orders: {counts.orderCount || 0}</div>
          <div>Receipts: {counts.receiptCount || 0}</div>
          <div>Payments: {counts.paymentCount || 0}</div>
          <div>Expenses: {counts.expenseCount || 0}</div>
          <div>Loans: {counts.loanCount || 0}</div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Limit Warnings</div>
        {limitComparison.hasAnyLimitIssue ? (
          <ul className="list-disc pl-5 text-rose-600 text-sm">
            {(limitComparison.warnings || []).map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        ) : (
          <div className="text-sm text-emerald-700">All usage is within subscribed limits.</div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold mb-2">Recent Usage Snapshots</div>
        <div className="space-y-2 text-sm">
          {snapshots.map((snapshot) => (
            <div key={snapshot._id} className="rounded border px-3 py-2">
              <div className="font-medium">{new Date(snapshot.snapshotDate).toLocaleString()}</div>
              <div className="text-zinc-600">
                Users {snapshot.userCount} / Warehouses {snapshot.warehouseCount} / Vehicles {snapshot.vehicleCount} / Modules {snapshot.assignedModuleCount}
              </div>
            </div>
          ))}
          {snapshots.length === 0 ? <div className="text-zinc-500">No snapshots yet. Generate one via API.</div> : null}
        </div>
      </div>
    </div>
  );
}
