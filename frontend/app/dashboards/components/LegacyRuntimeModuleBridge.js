"use client";

import DynamicDashboardShell from "./DynamicDashboardShell";
import { RuntimeDashboardProvider, useRuntimeDashboardContext } from "../../lib/runtimeDashboardContext";
import { RuntimeModuleRenderer } from "../../runtime-dashboard/moduleRegistry";

function LegacyRuntimeModuleBridgeContent({ moduleCode, emptyMessage }) {
  const { dashboard, loading, error, refresh } = useRuntimeDashboardContext();

  if (!dashboard && loading) return <div className="p-6 text-sm">Loading dashboard...</div>;

  if (!dashboard) {
    return (
      <div className="rounded-xl border bg-white p-5 text-sm">
        <div className="font-semibold text-zinc-900">Failed to load dashboard</div>
        <div className="mt-2 text-zinc-600">{error || "Could not load runtime dashboard."}</div>
        <button className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white" onClick={() => refresh().catch(() => undefined)}>
          Retry
        </button>
      </div>
    );
  }

  const moduleItem = (dashboard.modules || []).find((item) => String(item.moduleCode || "").toLowerCase() === String(moduleCode || "").toLowerCase());

  return (
    <DynamicDashboardShell dashboard={dashboard}>
      {moduleItem ? (
        <RuntimeModuleRenderer moduleItem={moduleItem} dashboard={dashboard} />
      ) : (
        <div className="rounded-xl border bg-white p-5 text-sm text-zinc-600">
          {emptyMessage || "This module is not assigned to your role yet."}
        </div>
      )}
    </DynamicDashboardShell>
  );
}

export default function LegacyRuntimeModuleBridge(props) {
  return (
    <RuntimeDashboardProvider>
      <LegacyRuntimeModuleBridgeContent {...props} />
    </RuntimeDashboardProvider>
  );
}
