"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function PortalMobileNav({ items = [] }) {
  const pathname = usePathname();
  const visibleItems = items.slice(0, 5);
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden"><div className="grid grid-cols-5 gap-1">{visibleItems.map((item) => { const active = pathname === item.path || pathname.startsWith(`${item.path}/`); return <Link key={item.key || item.path} href={item.path} className={`rounded-2xl px-2 py-2 text-center text-[10px] font-bold transition ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"}`}>{item.name || item.title}</Link>; })}</div></div>;
}
