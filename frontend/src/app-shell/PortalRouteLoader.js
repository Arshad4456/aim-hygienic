"use client";
import { PORTAL_ROUTE_REGISTRY } from "../config/portalRegistry";
export default function PortalRouteLoader({ pathname }) {
  const routeFile = PORTAL_ROUTE_REGISTRY[pathname];
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6"><p className="text-sm font-bold text-slate-900">Route mapped</p><p className="mt-1 text-sm text-slate-500">{pathname}</p>{routeFile ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-xs text-slate-600">{routeFile}</p> : null}</div>;
}
