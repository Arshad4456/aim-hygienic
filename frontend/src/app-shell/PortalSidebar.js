"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_CONFIG, getBrandInitials } from "@/src/config/brand";
import { buildSidebarSections } from "@/src/config/menus";

function isActivePath(pathname, itemPath) {
  if (!itemPath) return false;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function PortalSidebar({ menu = [], user }) {
  const pathname = usePathname();
  const sections = buildSidebarSections(menu);

  return (
    <aside className="hidden h-screen w-80 shrink-0 border-r border-slate-800 bg-slate-950 text-white lg:sticky lg:top-0 lg:block">
      <div className="flex h-full flex-col">
        <div className="p-5">
          <div className="rounded-[28px] bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 p-5 shadow-xl shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">{getBrandInitials()}</span>
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.28em] text-white/75">{BRAND_CONFIG.shortName}</p>
                <h2 className="mt-1 text-2xl font-black">ERP Portal</h2>
              </div>
            </div>
            <p className="mt-3 truncate text-xs text-white/80">{user?.companyName || "Company Workspace"}</p>
            <p className="mt-1 truncate text-xs text-white/65">{user?.fullName || user?.username || user?.name || "ERP User"}</p>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {sections.map((section) => (
            <div key={section.category}>
              <p className="px-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{section.category}</p>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const active = isActivePath(pathname, item.path);
                  return (
                    <Link
                      key={item.key}
                      href={item.path}
                      title={item.description || item.name}
                      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950 shadow" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-slate-300 group-hover:bg-white/15 group-hover:text-white"}`}>{item.icon || "•"}</span>
                      <span className="min-w-0">
                        <span className="block truncate">{item.name}</span>
                        <span className={`mt-0.5 block truncate text-[11px] font-medium ${active ? "text-slate-500" : "text-slate-500 group-hover:text-slate-300"}`}>{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
