"use client";

import Link from "next/link";

export default function DynamicDashboardHome({ dashboard }) {
  const appName = dashboard?.settings?.appName || dashboard?.company?.name || "ERP";
  const roleName = dashboard?.role?.roleName || "Role";
  const shared = (dashboard?.shell?.sharedFeatures || []).filter((item) => item?.isEnabled);
  const modules = dashboard?.modules || [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Welcome to {appName}</h2>
        <p className="text-sm text-zinc-600 mt-1">Role: {roleName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {shared.map((feature) => (
          <div key={feature.code} className="rounded-xl border bg-white p-3 text-sm font-medium">
            {feature.title}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Assigned Modules</h3>
        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-zinc-600">
            No modules assigned for this role yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modules.map((mod) => (
              <Link key={mod.moduleCode} href={`/runtime-dashboard/${mod.moduleCode}`} className="rounded-xl border bg-white p-4 hover:border-emerald-300">
                <div className="font-semibold text-zinc-900">{mod.moduleName}</div>
                <div className="text-xs text-zinc-500 mt-1">Type: {mod.moduleType || "default"}</div>
                <div className="text-xs text-zinc-500 mt-1">Path: {mod.sidebarPath}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}