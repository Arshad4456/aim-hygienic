"use client";
import Link from "next/link";
export default function PortalBreadcrumbs({ parts = [] }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500"><Link href="/portals" className="font-semibold text-emerald-700">Portals</Link>{parts.map((part, index) => <span key={`${part}-${index}`} className="flex items-center gap-2"><span>/</span><span className="capitalize">{String(part).replace(/-/g, " ")}</span></span>)}</div>;
}
