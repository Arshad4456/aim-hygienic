"use client";

import { useEffect, useMemo, useState } from "react";
import territoryService from "../../../services/territoryService";

const QUICK_LINKS = [
  { label: "Regions", href: "/portals/master-data/regions", description: "Top-level sales and warehouse coverage." },
  { label: "Zones", href: "/portals/master-data/zones", description: "Region-wise zone planning." },
  { label: "Territories / Areas", href: "/portals/master-data/areas", description: "Selling territories and customer coverage." },
  { label: "Fields", href: "/portals/master-data/fields", description: "Field-level beat or route coverage." },
];

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value ?? 0}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
      <p className="text-lg font-black text-slate-950">No territory structure found yet.</p>
      <p className="mt-2 text-sm text-slate-500">
        Start by adding Regions, then Zones, Territories/Areas, and Fields. This hierarchy will be used later for sales targets,
        user assignment, distributor coverage, and live-location reporting.
      </p>
    </div>
  );
}

export default function TerritoryArchitecturePage() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let alive = true;
    territoryService
      .overview()
      .then((data) => alive && setState({ loading: false, error: "", data }))
      .catch((error) => alive && setState({ loading: false, error: error.message || "Unable to load territory architecture", data: null }));
    return () => {
      alive = false;
    };
  }, []);

  const totals = state.data?.totals || {};
  const hierarchy = useMemo(() => state.data?.hierarchy?.regions || [], [state.data]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 p-8 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-white/80">Phase 4 Territory Master Data</p>
        <h2 className="mt-4 text-3xl font-black">Region → Zone → Territory → Field</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">
          This workspace connects territory overview with real CRUD screens for Regions, Zones, Territories/Areas, and Fields. Sales users, distributors, warehouses, live tracking, reports, and customer coverage use this hierarchy.
        </p>
      </section>

      {state.loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading territory architecture…</div> : null}
      {state.error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{state.error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Regions" value={totals.regions} hint={`${totals.activeRegions || 0} active`} />
        <StatCard label="Zones" value={totals.zones} hint={`${totals.activeZones || 0} active`} />
        <StatCard label="Territories" value={totals.territories} hint={`${totals.activeTerritories || 0} active`} />
        <StatCard label="Fields" value={totals.fields} hint={`${totals.activeFields || 0} active`} />
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <a key={item.href} href={item.href} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-lg font-black text-slate-950">{item.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
            <p className="mt-4 text-sm font-bold text-cyan-700">Open setup →</p>
          </a>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Current hierarchy</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Territory tree</h3>
        </div>
        <div className="p-6">
          {!state.loading && !hierarchy.length ? <EmptyState /> : null}
          <div className="space-y-4">
            {hierarchy.slice(0, 20).map((region) => (
              <div key={region._id || region.regionId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">{region.name || "Unnamed Region"}</p>
                    <p className="text-xs text-slate-500">Region ID: {region.regionId || "—"} · Warehouse: {region.warehouseName || "—"}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{region.zones?.length || 0} zones</span>
                </div>
                {region.zones?.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {region.zones.map((zone) => (
                      <div key={zone._id || zone.zoneId} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                        <p className="font-black text-slate-900">{zone.name || "Unnamed Zone"}</p>
                        <p className="text-xs text-slate-500">Zone ID: {zone.zoneId || "—"} · {zone.areas?.length || 0} territories</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
