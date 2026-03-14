"use client";

import Link from "next/link";
import { getModuleMeta } from "../../lib/platform/moduleCatalog";

export default function DynamicDashboardHome({ dashboard }) {
  const company = dashboard?.company || {};
  const settings = dashboard?.settings || {};
  const role = dashboard?.role || {};
  const modules = (dashboard?.modules || []).filter((item) => item?.isActive !== false);
  const sharedFeatures = (dashboard?.shell?.sharedFeatures || []).filter((item) => item?.isEnabled !== false);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="text-sm text-zinc-500">Runtime Dashboard</div>
        <h1 className="text-2xl font-bold text-zinc-900 mt-1">{settings.appName || company.name || "Company Dashboard"}</h1>
        <p className="text-sm text-zinc-600 mt-2">Signed in as {role.roleName || role.roleCode || "Role"}. This dashboard is assembled from the runtime configuration engine.</p>
      </section>

      {sharedFeatures.length ? (
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {sharedFeatures.map((feature) => (
            <div key={feature.code} className="rounded-2xl border bg-white p-4">
              <div className="font-medium text-zinc-900">{feature.title}</div>
              <div className="text-xs text-zinc-500 mt-1">Shared dashboard feature</div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="text-sm font-semibold text-zinc-700">Assigned Modules</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.length ? modules.map((moduleItem) => {
            const meta = getModuleMeta(moduleItem.moduleCode);
            return (
              <Link key={`${moduleItem.moduleCode}-${moduleItem.sidebarOrder || 0}`} href={`/runtime-dashboard/${moduleItem.moduleCode}`} className="rounded-2xl border bg-white p-4 hover:border-emerald-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-zinc-900">{moduleItem.moduleName || meta.label}</div>
                    <div className="text-xs text-zinc-500 mt-1">{moduleItem.moduleType || "default"}</div>
                  </div>
                  <div className="text-xl">{meta.icon}</div>
                </div>
                {moduleItem.selectedSections?.length ? <div className="text-xs text-zinc-600 mt-3">Sections: {moduleItem.selectedSections.join(", ")}</div> : null}
                {moduleItem.allowedActions?.length ? <div className="text-xs text-zinc-500 mt-1">Actions: {moduleItem.allowedActions.join(", ")}</div> : null}
              </Link>
            );
          }) : <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-600">No modules have been assigned to this role yet.</div>}
        </div>
      </section>
    </div>
  );
}
