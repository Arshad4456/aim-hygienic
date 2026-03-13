"use client";

import Link from "next/link";

export default function ConfigSnapshotTable({ companyId, snapshots = [] }) {
  return (
    <div className="rounded-xl border bg-white overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="text-left p-3">Version</th>
            <th className="text-left p-3">Label</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Summary</th>
            <th className="text-left p-3">Created At</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot._id} className="border-t">
              <td className="p-3">
                <Link href={`/platform-admin/companies/${companyId}/config-snapshots/${snapshot._id}`} className="text-emerald-700 hover:underline">
                  v{snapshot.versionNumber}
                </Link>
              </td>
              <td className="p-3">{snapshot.versionLabel || "-"}</td>
              <td className="p-3">{snapshot.snapshotType}</td>
              <td className="p-3">{snapshot.summary || "-"}</td>
              <td className="p-3">{new Date(snapshot.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {snapshots.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-zinc-500">No configuration snapshots found.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}