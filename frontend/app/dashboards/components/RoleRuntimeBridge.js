"use client";

import DynamicDashboardShell from "./DynamicDashboardShell";
import DynamicDashboardHome from "./DynamicDashboardHome";
import { RuntimeDashboardProvider, useRuntimeDashboardContext } from "../../lib/runtimeDashboardContext";

function RoleRuntimeBridgeInner({ title, subtitle }) {
  const { dashboard, loading, error, refresh } = useRuntimeDashboardContext();

  if (!dashboard && loading) {
    return <div className="min-h-screen p-6 text-sm">Loading dashboard...</div>;
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="rounded-2xl border bg-white p-5 max-w-lg">
          <div className="text-xl font-semibold text-zinc-900">{title || "Dashboard"}</div>
          <div className="text-sm text-zinc-600 mt-2">{subtitle || "This role now prefers the runtime dashboard engine."}</div>
          <div className="text-sm text-red-600 mt-3">{error || "Runtime dashboard is not available yet for this role."}</div>
          <button className="mt-4 rounded bg-emerald-600 text-white px-4 py-2" onClick={() => refresh().catch(() => undefined)}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <DynamicDashboardShell dashboard={dashboard}>
      <DynamicDashboardHome dashboard={dashboard} />
    </DynamicDashboardShell>
  );
}

export default function RoleRuntimeBridge(props) {
  return (
    <RuntimeDashboardProvider>
      <RoleRuntimeBridgeInner {...props} />
    </RuntimeDashboardProvider>
  );
}
