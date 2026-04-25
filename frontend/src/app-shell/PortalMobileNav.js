"use client";
import Link from "next/link";
export default function PortalMobileNav({ items = [] }) {
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden"><div className="grid grid-cols-4 gap-2">{items.slice(0, 4).map((item) => <Link key={item.key || item.path} href={item.path} className="rounded-2xl px-2 py-2 text-center text-[11px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700">{item.name || item.title}</Link>)}</div></div>;
}
