"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function PortalSidebar({ menu = [], user }) {
  const pathname = usePathname();
  return <aside className="hidden w-76 shrink-0 border-r border-slate-800 bg-slate-950 text-white lg:block"><div className="p-5"><div className="rounded-[28px] bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 p-5 shadow-xl shadow-emerald-950/20"><p className="text-xs uppercase tracking-[0.28em] text-white/75">Rawyan ERP</p><h2 className="mt-1 text-2xl font-black">Business Portal</h2><p className="mt-2 text-xs text-white/80">{user?.companyName || "Company Workspace"}</p><p className="mt-1 text-xs text-white/65">{user?.fullName || user?.username || user?.name || "ERP User"}</p></div></div><nav className="space-y-1 px-3 pb-6">{menu.map((item) => { const active = pathname === item.path || pathname.startsWith(`${item.path}/`); return <Link key={item.key} href={item.path} className={`group block rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950 shadow" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}><span className="block">{item.name}</span><span className={`mt-0.5 block text-[11px] font-medium ${active ? "text-slate-500" : "text-slate-500 group-hover:text-slate-300"}`}>{item.category}</span></Link>; })}</nav></aside>;
}
