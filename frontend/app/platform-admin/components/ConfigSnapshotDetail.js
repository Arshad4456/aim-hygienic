"use client";

export default function ConfigSnapshotDetail({ snapshot }) {
  const data = snapshot?.snapshotData || {};

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div><b>Hierarchy:</b> {data?.hierarchy?.hierarchyCode || "-"}</div>
        <div><b>Roles:</b> {(data.roles || []).length}</div>
        <div><b>Dashboards:</b> {(data.dashboards || []).length}</div>
        <div><b>Modules:</b> {(data.modules || []).length}</div>
        <div><b>Permissions:</b> {(data.permissions || []).length}</div>
        <div><b>Doc Templates:</b> {(data.documentTemplates || []).length}</div>
        <div><b>Plan:</b> {data?.subscription?.planCode || "-"}</div>
        <div><b>Subscription:</b> {data?.subscription?.status || "-"}</div>
      </div>

      <div>
        <div className="font-semibold mb-1">Settings</div>
        <pre className="bg-zinc-100 rounded p-2 overflow-auto text-xs">{JSON.stringify(data.settings || {}, null, 2)}</pre>
      </div>
      <div>
        <div className="font-semibold mb-1">Hierarchy</div>
        <pre className="bg-zinc-100 rounded p-2 overflow-auto text-xs">{JSON.stringify(data.hierarchy || {}, null, 2)}</pre>
      </div>
      <div>
        <div className="font-semibold mb-1">Subscription Summary</div>
        <pre className="bg-zinc-100 rounded p-2 overflow-auto text-xs">{JSON.stringify(data.subscription || {}, null, 2)}</pre>
      </div>
    </div>
  );
}