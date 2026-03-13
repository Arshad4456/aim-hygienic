"use client";

export default function AuditLogTable({ logs = [], onSelect }) {
  return (
    <div className="rounded-xl border bg-white overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="text-left p-3">Time</th>
            <th className="text-left p-3">Actor</th>
            <th className="text-left p-3">Role</th>
            <th className="text-left p-3">Action</th>
            <th className="text-left p-3">Summary</th>
            <th className="text-left p-3">Company</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id} className="border-t hover:bg-zinc-50 cursor-pointer" onClick={() => onSelect?.(log)}>
              <td className="p-3">{new Date(log.createdAt).toLocaleString()}</td>
              <td className="p-3">{log.actorName || "-"}</td>
              <td className="p-3">{log.actorRole || "-"}</td>
              <td className="p-3">{log.actionType}</td>
              <td className="p-3">{log.summary}</td>
              <td className="p-3">{log.metadata?.companyName || (log.companyId ? String(log.companyId) : "Platform")}</td>
            </tr>
          ))}
          {logs.length === 0 ? (
            <tr><td colSpan={6} className="p-4 text-center text-zinc-500">No audit logs found.</td></tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}