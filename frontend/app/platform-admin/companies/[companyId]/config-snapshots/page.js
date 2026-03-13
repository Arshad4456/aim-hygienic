"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import ConfigSnapshotTable from "../../../components/ConfigSnapshotTable";
import CreateSnapshotModal from "../../../components/CreateSnapshotModal";

export default function CompanyConfigSnapshotsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.companyId;
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/platform-admin/companies/${companyId}/config-snapshots`);
        if (!mounted) return;
        setSnapshots(data?.snapshots || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load configuration snapshots");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  async function handleCreate(payload) {
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/config-snapshots`, { method: "POST", body: payload });
      setOpenCreate(false);
      const data = await apiFetch(`/platform-admin/companies/${companyId}/config-snapshots`);
      setSnapshots(data?.snapshots || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to create snapshot");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Configuration Snapshots</h1>
          <p className="text-sm text-zinc-600">Company ID: {companyId}</p>
        </div>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-2 text-sm" onClick={() => router.push(`/platform-admin/companies/${companyId}/onboarding`)}>Back to Onboarding</button>
          <button className="rounded bg-emerald-600 text-white px-3 py-2 text-sm" onClick={() => setOpenCreate(true)}>Create Snapshot</button>
        </div>
      </div>

      {loading ? <div className="text-sm">Loading snapshots...</div> : null}
      {error ? <div className="rounded border bg-white p-3 text-sm text-rose-600">{error}</div> : null}
      {!loading && !error ? <ConfigSnapshotTable companyId={companyId} snapshots={snapshots} /> : null}

      <CreateSnapshotModal open={openCreate} onClose={() => setOpenCreate(false)} onCreate={handleCreate} />
    </div>
  );
}
