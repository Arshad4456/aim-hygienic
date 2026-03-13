"use client";

export default function AuditLogDetail({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-white p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Audit Log Detail</div>
          <button onClick={onClose} className="border rounded px-2 py-1 text-sm">Close</button>
        </div>
        <div className="space-y-2 text-sm">
          <div><b>Summary:</b> {log.summary}</div>
          <div><b>Action:</b> {log.actionType}</div>
          <div><b>Actor:</b> {log.actorName || "-"} ({log.actorRole || "-"})</div>
          <div><b>Target:</b> {log.targetType} / {log.targetId}</div>
          <div><b>Time:</b> {new Date(log.createdAt).toLocaleString()}</div>
          <div><b>Metadata:</b></div>
          <pre className="bg-zinc-100 rounded p-2 text-xs overflow-auto">{JSON.stringify(log.metadata || {}, null, 2)}</pre>
          <div><b>Before Snapshot:</b></div>
          <pre className="bg-zinc-100 rounded p-2 text-xs overflow-auto">{JSON.stringify(log.beforeSnapshot || null, null, 2)}</pre>
          <div><b>After Snapshot:</b></div>
          <pre className="bg-zinc-100 rounded p-2 text-xs overflow-auto">{JSON.stringify(log.afterSnapshot || null, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
