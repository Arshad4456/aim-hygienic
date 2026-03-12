"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function RuntimeDataModule({ moduleItem, title, endpointMap = {} }) {
  const [dataBySection, setDataBySection] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sections = useMemo(() => moduleItem?.selectedSections || [], [moduleItem]);
  const canCreate = (moduleItem?.allowedActions || []).includes("create");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const next = {};
        for (const section of sections) {
          const endpoint = endpointMap[section];
          if (!endpoint) continue;
          const res = await apiFetch(endpoint);
          next[section] = res;
        }
        if (!cancelled) setDataBySection(next);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load module data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sections.join("|"), JSON.stringify(endpointMap)]);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        {canCreate ? <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white">Create</button> : null}
      </div>
      <div className="text-sm text-zinc-600">Type: {moduleItem?.moduleType || "default"}</div>
      <div className="text-sm text-zinc-600">Subtypes: {(moduleItem?.selectedSubtypes || []).join(", ") || "-"}</div>
      <div className="text-sm text-zinc-600">Allowed actions: {(moduleItem?.allowedActions || []).join(", ") || "-"}</div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-zinc-500">Loading module data...</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section) => {
          const sectionData = dataBySection[section];
          const list = Object.values(sectionData || {}).find((value) => Array.isArray(value)) || [];
          const sectionPermissions = (moduleItem?.sectionPermissions || []).find((sp) => sp.sectionCode === section);
          return (
            <div key={section} className="rounded-lg border p-3">
              <div className="font-medium text-sm">{section}</div>
              <div className="text-xs text-zinc-500 mt-1">Actions: {(sectionPermissions?.allowedActions || []).join(", ") || "-"}</div>
              <div className="mt-2 text-sm text-zinc-700">Records: {list.length}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}