"use client";

import Link from "next/link";

function statusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "trial") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalized === "suspended") return "bg-orange-50 text-orange-700 border-orange-200";
  if (normalized === "expired") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export default function CompanyUsageTable({ companies = [] }) {
  return (
    <div className="rounded-xl border bg-white overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="text-left p-3">Company</th>
            <th className="text-left p-3">Plan</th>
            <th className="text-left p-3">Lifecycle</th>
            <th className="text-left p-3">Onboarding</th>
            <th className="text-left p-3">Users</th>
            <th className="text-left p-3">Warehouses</th>
            <th className="text-left p-3">Vehicles</th>
            <th className="text-left p-3">Modules</th>
            <th className="text-left p-3">Warnings</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((row) => (
            <tr key={row.company._id} className="border-t align-top">
              <td className="p-3">
                <Link href={`/platform-admin/analytics/companies/${row.company._id}`} className="font-medium text-emerald-700 hover:underline">
                  {row.company.name}
                </Link>
                <div className="text-xs text-zinc-500">{row.company.slug}</div>
              </td>
              <td className="p-3">{row.subscription.planName || row.subscription.planCode || "-"}</td>
              <td className="p-3">
                <span className={`inline-flex rounded border px-2 py-1 text-xs ${statusBadge(row.company.lifecycleStatus)}`}>{row.company.lifecycleStatus || "inactive"}</span>
              </td>
              <td className="p-3">{row.onboarding.completed ? "Completed" : "Incomplete"}</td>
              <td className="p-3">{row.counts.userCount} ({row.counts.activeUserCount} active)</td>
              <td className="p-3">{row.counts.warehouseCount}</td>
              <td className="p-3">{row.counts.vehicleCount}</td>
              <td className="p-3">{row.counts.assignedModuleCount}</td>
              <td className="p-3">
                {row.limits.hasAnyLimitIssue ? (
                  <ul className="list-disc pl-5 text-rose-600">
                    {row.limits.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                ) : (
                  <span className="text-emerald-700">Within limits</span>
                )}
              </td>
            </tr>
          ))}
          {companies.length === 0 ? (
            <tr>
              <td colSpan={9} className="p-4 text-center text-zinc-500">No companies found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}