"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DynamicDashboardHome from "../dashboards/components/DynamicDashboardHome";
import DynamicDashboardShell from "../dashboards/components/DynamicDashboardShell";
import { RuntimeDashboardProvider, useRuntimeDashboardContext } from "../lib/runtimeDashboardContext";
import { getAuthItem } from "../lib/clientAuth";

function RuntimeDashboardPageContent() {
  const router = useRouter();
  const { dashboard, loading, error, refresh } = useRuntimeDashboardContext();

  useEffect(() => {
    const token = getAuthItem("aim_token");
    if (!token) router.replace("/login");
  }, [router]);

  if (!dashboard && loading) return <div className="p-6 text-sm">Loading runtime dashboard...</div>;

  if (!dashboard) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="rounded-xl border bg-white p-5 max-w-lg">
          <div className="font-semibold">Failed to load runtime dashboard</div>
          <div className="text-sm text-zinc-600 mt-2">{error || "Please try again."}</div>
          <button className="mt-4 rounded bg-emerald-600 text-white px-4 py-2" onClick={() => refresh().catch(() => undefined)}>
            Retry
          </button>
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

export default function RuntimeDashboardPage() {
  return (
    <RuntimeDashboardProvider>
      <RuntimeDashboardPageContent />
    </RuntimeDashboardProvider>
  );
}
