"use client";
import Link from "next/link";
import { RAWYAN_DEFAULT_MENU } from "../config/menus";
export default function PortalSidebar({ items = RAWYAN_DEFAULT_MENU, activePath = "" }) {
  return <nav className="flex h-full flex-col gap-2 p-4"><div className="mb-4 rounded-3xl bg-gradient-to-br from-emerald-600 via-cyan-600 to-blue-700 p-4 text-white"><p className="text-xs uppercase tracking-[0.22em] text-white/70">SaaS ERP</p><p className="mt-1 text-xl font-black">Rawyan ERP</p></div>{items.map((item) => { const active = activePath === item.path || activePath.startsWith(`${item.path}/`); return <Link key={item.key || item.path} href={item.path} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>{item.name || item.title}</Link>; })}</nav>;
}
