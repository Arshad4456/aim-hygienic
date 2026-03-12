"use client";

import DynamicDashboardShell from "../../dashboards/components/DynamicDashboardShell";
import { RuntimeDashboardProvider, useRuntimeDashboardContext } from "../../lib/runtimeDashboardContext";

function RuntimeModulePageContent({ params }) {
  const { dashboard, loading, error, refresh } = useRuntimeDashboardContext();
  const slug = Array.isArray(params?.slug) ? params.slug : [];
  const routeKey = String(slug[slug.length - 1] || "").toLowerCase();

  if (!dashboard && loading) return <div className="p-6 text-sm">Loading module...</div>;

  if (!dashboard) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="rounded-xl border bg-white p-5">
          <div className="font-semibold">Failed to load runtime dashboard</div>
          <div className="text-sm text-zinc-600 mt-2">{error || "Please try again."}</div>
          <button className="mt-4 rounded bg-emerald-600 text-white px-4 py-2" onClick={() => refresh().catch(() => undefined)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const moduleItem = (dashboard.modules || []).find((item) => String(item.moduleCode || "").toLowerCase() === routeKey);

  return (
    <DynamicDashboardShell dashboard={dashboard}>
      {!moduleItem ? (
        <div className="rounded-xl border bg-white p-5 text-sm">Module not found for this role.</div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-white p-5">
          <h1 className="text-xl font-semibold">{moduleItem.moduleName}</h1>
          <p className="text-sm text-zinc-600">Code: {moduleItem.moduleCode}</p>
          <p className="text-sm text-zinc-600">Type: {moduleItem.moduleType || "default"}</p>
          <p className="text-sm text-zinc-600">Subtypes: {(moduleItem.selectedSubtypes || []).join(", ") || "-"}</p>
          <p className="text-sm text-zinc-600">Sections: {(moduleItem.selectedSections || []).join(", ") || "-"}</p>
          <p className="text-sm text-zinc-600">Allowed actions: {(moduleItem.allowedActions || []).join(", ") || "-"}</p>
          <div>
            <div className="text-sm font-medium mb-2">Section permissions</div>
            {(moduleItem.sectionPermissions || []).length === 0 ? (
              <div className="text-sm text-zinc-500">No section permissions configured.</div>
            ) : (
              <ul className="space-y-1 text-sm text-zinc-700">
                {moduleItem.sectionPermissions.map((section) => (
                  <li key={section.sectionCode}>
                    {section.sectionCode}: {(section.allowedActions || []).join(", ") || "-"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DynamicDashboardShell>
  );
}

export default function RuntimeModulePage({ params }) {
  return (
    <RuntimeDashboardProvider>
      <RuntimeModulePageContent params={params} />
    </RuntimeDashboardProvider>
  );
}