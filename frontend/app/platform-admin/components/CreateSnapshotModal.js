"use client";

import { useState } from "react";

export default function CreateSnapshotModal({ open, onClose, onCreate }) {
  const [versionLabel, setVersionLabel] = useState("");
  const [summary, setSummary] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold">Create Configuration Snapshot</div>
        <input className="mt-3 w-full border rounded px-3 py-2 text-sm" placeholder="Version label" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} />
        <textarea className="mt-2 w-full border rounded px-3 py-2 text-sm" placeholder="Summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button className="border rounded px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
          <button
            className="rounded bg-emerald-600 text-white px-3 py-2 text-sm"
            onClick={() => onCreate({ versionLabel, summary, snapshotType: "manual" })}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
