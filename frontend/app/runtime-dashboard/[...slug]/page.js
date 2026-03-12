"use client";

import DynamicDashboardShell from "../../dashboards/components/DynamicDashboardShell";
import { RuntimeDashboardProvider, useRuntimeDashboardContext } from "../../lib/runtimeDashboardContext";
import { RuntimeModuleRenderer } from "../moduleRegistry";

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
        <RuntimeModuleRenderer moduleItem={moduleItem} dashboard={dashboard} />
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
