"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { adminSidebarFallbackConfig } from "./sidebarFallbackConfig";
import { getModuleMeta } from "../../../lib/platform/moduleCatalog";

function Icon({ name }) {
  const common = "h-5 w-5";
  const map = {
    dashboard: "📊",
    sales: "💹",
    products: "📦",
    expense: "🧾",
    account: "👤",
    customer: "🧑‍🤝‍🧑",
    supplier: "🏭",
    qc: "✅",
    finance: "💰",
    route: "🗺️",
    scheme: "🎁",
    purchase: "🛒",
    delivery: "🚚",
    orders: "🧺",
    tracking: "📍",
    reports: "📄",
    settings: "⚙️",
    territory: "🧭",
    users: "🧑‍💼",
    inventory: "🏬",
    logistics: "🧭",
    hr: "👥",
    messages: "💬",
    operations: "🛰️",
    vehicle: "🚘",
  };
  return <span className={common}>{map[name] || "•"}</span>;
}

const defaultOpenState = {
  dashboard: false,
  company: false,
  platform: false,
  hr: false,
  products: false,
  expense: false,
  qc: false,
  procurement: false,
  orders: false,
  logistics: false,
  finance: false,
  territory: false,
  users: false,
  inventory: false,
  accountManagement: false,
  vehicleManagement: false,
};

let adminSidebarOpenCache = { ...defaultOpenState };

function runtimeMenuToSidebar(runtimeSidebarItems = []) {
  const children = runtimeSidebarItems
    .filter((item) => item?.isActive !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((item) => {
      const meta = getModuleMeta(item.code);
      return { title: item.label || meta.label, href: item.path || `/runtime-dashboard/${item.code}`, icon: meta.icon, code: item.code };
    });

  if (!children.length) return [];

  return [
    {
      type: "group",
      key: "runtime",
      title: "Runtime Modules",
      icon: "dashboard",
      runtime: true,
      children,
    },
  ];
}

export default function Sidebar({ user, variant = "desktop", onClose, collapsed = false, runtimeSidebarItems = [] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(() => ({ ...adminSidebarOpenCache }));

  const menu = useMemo(() => {
    const runtimeMenu = runtimeMenuToSidebar(runtimeSidebarItems);
    return runtimeMenu.length ? runtimeMenu : adminSidebarFallbackConfig;
  }, [runtimeSidebarItems]);

  function go(href) {
    router.push(href);
    if (variant === "mobile" && onClose) onClose();
  }

  function toggle(key) {
    const next = { ...open, [key]: !open[key] };
    adminSidebarOpenCache = next;
    setOpen(next);
  }

  const wrapperClass = collapsed
    ? "w-[88px] border-r bg-white h-full overflow-y-auto"
    : "w-[280px] border-r bg-white h-full overflow-y-auto";

  return (
    <aside className={wrapperClass}>
      <div className="px-4 py-4 border-b sticky top-0 bg-white z-10">
        <div className="font-semibold text-zinc-900 text-sm">AIM Hygienic</div>
        {!collapsed ? (
          <div className="text-xs text-zinc-500 mt-1">{user?.role || "admin"} • Navigation</div>
        ) : null}
      </div>

      <div className="p-3 space-y-2">
        {menu.map((item) => {
          if (item.type === "link") {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm border ${active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-transparent hover:border-zinc-200 hover:bg-zinc-50 text-zinc-700"}`}
                title={item.title}
              >
                <Icon name={item.icon} />
                {!collapsed ? <span>{item.title}</span> : null}
              </button>
            );
          }

          const isOpen = open[item.key];
          const activeChild = item.children?.some((child) => pathname === child.href || pathname?.startsWith(`${child.href}/`));

          return (
            <div key={item.key} className="rounded-2xl border border-zinc-100 bg-zinc-50/70">
              <button
                type="button"
                onClick={() => toggle(item.key)}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left ${activeChild ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-100/70 text-zinc-800"}`}
                title={item.title}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon name={item.icon} />
                  {!collapsed ? <span className="text-sm font-medium truncate">{item.title}</span> : null}
                </div>
                {!collapsed ? <span className="text-xs">{isOpen ? "−" : "+"}</span> : null}
              </button>

              {!collapsed && isOpen ? (
                <div className="pb-2 px-2 space-y-1">
                  {item.children.map((child) => {
                    const active = pathname === child.href || pathname?.startsWith(`${child.href}/`);
                    return (
                      <button
                        key={child.href}
                        type="button"
                        onClick={() => go(child.href)}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm border ${active ? "border-emerald-300 bg-white text-emerald-700" : "border-transparent bg-transparent hover:bg-white hover:border-zinc-200 text-zinc-700"}`}
                      >
                        {child.title}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
