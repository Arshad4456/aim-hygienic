"use client";

import { useState } from "react";

export default function RestoreSnapshotModal({ open, onClose, onConfirm, snapshot }) {
  const [restoreSubscription, setRestoreSubscription] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold">Restore Snapshot v{snapshot?.versionNumber}</div>
        <p className="text-sm text-zinc-600 mt-1">This will restore configuration only and create a safety snapshot first.</p>
        <label className="flex items-center gap-2 text-sm mt-3">
          <input type="checkbox" checked={restoreSubscription} onChange={(e) => setRestoreSubscription(e.target.checked)} />
          Restore subscription summary too
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <button className="border rounded px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button className="rounded bg-rose-600 text-white px-3 py-2 text-sm" onClick={() => onConfirm({ restoreSubscription })}>Restore</button>
        </div>
      </div>
    </div>
  );
}