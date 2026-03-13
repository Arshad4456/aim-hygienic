"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../../../lib/api";
import ConfigSnapshotDetail from "../../../../components/ConfigSnapshotDetail";
import RestoreSnapshotModal from "../../../../components/RestoreSnapshotModal";

export default function ConfigSnapshotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.companyId;
  const snapshotId = params?.snapshotId;
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openRestore, setOpenRestore] = useState(false);

  useEffect(() => {
    if (!companyId || !snapshotId) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/platform-admin/companies/${companyId}/config-snapshots/${snapshotId}`);
        if (!mounted) return;
        setSnapshot(data?.snapshot || null);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load snapshot detail");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [companyId, snapshotId]);

  async function handleRestore(options) {
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/config-snapshots/${snapshotId}/restore`, { method: "POST", body: options });
      setOpenRestore(false);
      router.push(`/platform-admin/companies/${companyId}/config-snapshots`);
    } catch (err) {
      setError(err?.message || "Failed to restore snapshot");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Snapshot v{snapshot?.versionNumber || "-"}</h1>
          <p className="text-sm text-zinc-600">{snapshot?.versionLabel || "No label"}</p>
        </div>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-2 text-sm" onClick={() => router.push(`/platform-admin/companies/${companyId}/config-snapshots`)}>Back</button>
          <button className="rounded bg-rose-600 text-white px-3 py-2 text-sm" onClick={() => setOpenRestore(true)}>Restore This Version</button>
        </div>
      </div>

      {loading ? <div className="text-sm">Loading snapshot detail...</div> : null}
      {error ? <div className="rounded border bg-white p-3 text-sm text-rose-600">{error}</div> : null}
      {!loading && !error && snapshot ? <ConfigSnapshotDetail snapshot={snapshot} /> : null}

      <RestoreSnapshotModal open={openRestore} onClose={() => setOpenRestore(false)} onConfirm={handleRestore} snapshot={snapshot} />
    </div>
  );
}