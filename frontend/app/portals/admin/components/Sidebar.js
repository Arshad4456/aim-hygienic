"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../../lib/language";
import { fetchModuleAccess, filterNavigationItems } from "../../../lib/moduleAccess";
import { getAdminNavigation } from "../../../lib/dashboardRegistry";

function Icon({ name }) {
  // No extra library required — simple, safe icons
  const common = "h-5 w-5";
  if (name === "dashboard") return <span className={common}>📊</span>;
  if (name === "sales") return <span className={common}>💹</span>;
  if (name === "products") return <span className={common}>📦</span>;
  if (name === "expense") return <span className={common}>🧾</span>;
  if (name === "account") return <span className={common}>👤</span>;
  if (name === "customer") return <span className={common}>🧑‍🤝‍🧑</span>;
  if (name === "supplier") return <span className={common}>🏭</span>;
  if (name === "qc") return <span className={common}>✅</span>;
  if (name === "finance") return <span className={common}>💰</span>;
  if (name === "route") return <span className={common}>🗺️</span>;
  if (name === "scheme") return <span className={common}>🎁</span>;
  if (name === "purchase") return <span className={common}>🛒</span>;
  if (name === "delivery") return <span className={common}>🚚</span>;
  if (name === "orders") return <span className={common}>🧺</span>;
  if (name === "tracking") return <span className={common}>📍</span>;
  if (name === "reports") return <span className={common}>📄</span>;
  if (name === "settings") return <span className={common}>⚙️</span>;
  if (name === "territory") return <span className={common}>🧭</span>;
  if (name === "users") return <span className={common}>🧑‍💼</span>;
  if (name === "inventory") return <span className={common}>🏬</span>;
  if (name === "logistics") return <span className={common}>🧭</span>;
  if (name === "hr") return <span className={common}>👥</span>;
  if (name === "messages") return <span className={common}>💬</span>;
  if (name === "operations") return <span className={common}>🛰️</span>;
  if (name === "vehicle") return <span className={common}>🚘</span>;
  return <span className={common}>•</span>;
}


const defaultOpenState = {
  dashboard: false,
  company: false,
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

export default function Sidebar({ user, variant = "desktop", onClose, collapsed = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  const [open, setOpen] = useState(() => ({ ...adminSidebarOpenCache }));
  const userRole = user?.role
    ? String(user.role).trim().toLowerCase()
    : (typeof window !== "undefined" ? String(window.sessionStorage.getItem("aim_role") || "").trim().toLowerCase() : "");
  const canAccessCompanyManagement = userRole === "admin" || userRole === "system admin";
  const [moduleRules, setModuleRules] = useState([]);

  useEffect(() => {
    let active = true;
    const companyId = user?.companyId || (() => {
      try {
        if (typeof window === "undefined") return "";
        const raw = window.sessionStorage.getItem("aim_user") || window.localStorage.getItem("aim_user");
        return raw ? JSON.parse(raw)?.companyId || "" : "";
      } catch {
        return "";
      }
    })();
    if (!companyId) {
      setModuleRules([]);
      return undefined;
    }
    fetchModuleAccess(companyId)
      .then((data) => {
        if (active) setModuleRules(Array.isArray(data?.rules) ? data.rules : []);
      })
      .catch(() => {
        if (active) setModuleRules([]);
      });
    return () => {
      active = false;
    };
  }, [user?.companyId]);

  const menu = useMemo(
    () => {
      const baseMenu = getAdminNavigation({ canAccessCompanyManagement });
      return filterNavigationItems(baseMenu, moduleRules, userRole);
    },
    [canAccessCompanyManagement, moduleRules, userRole]
  );

  function go(href) {
    router.push(href);
    if (variant === "mobile" && onClose) onClose();
  }

  function toggleOpen(key) {
    setOpen((state) => {
      const next = { ...state, [key]: !state[key] };
      adminSidebarOpenCache = next;
      return next;
    });
  }

  const widthClass =
    variant === "desktop"
      ? collapsed
        ? "w-[70px]"
        : "w-[260px]"
      : "w-[290px]";

  return (
    <aside
      dir={isRTL ? "rtl" : "ltr"}
      className={[
        "h-screen flex flex-col border-r bg-white",
        variant === "desktop" ? "hidden md:flex" : "flex",
        widthClass,
      ].join(" ")}
    >
      {/* Header (not scrolling) */}
      <div className="shrink-0 px-4 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold">AH</span>
          </div>

          {!collapsed ? (
            <div className="leading-tight">
              <div className="font-semibold text-zinc-900">{t("Admin")}</div>
              <div className="text-xs text-zinc-500">{user?.fullName || t("System Admin")}</div>
            </div>
          ) : null}
        </div>

        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Nav (THIS scrolls independently) */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {menu.map((item) => {
          // LINK
          if (item.type === "link") {
            const active = pathname === item.href;
            return (
              <button
                key={item.title}
                onClick={() => go(item.href)}
                className={[
                  "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm mb-1",
                  active ? "bg-emerald-50 text-emerald-700" : "text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
                title={collapsed ? t(item.title) : undefined}
              >
                <span className="flex items-center gap-2">
                  <Icon name={item.icon} />
                  {!collapsed ? <span>{t(item.title)}</span> : null}
                </span>

                {!collapsed && item.badge ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          }

          // GROUP
          const isOpen = !!open[item.key];

          return (
            <div key={item.title} className="mb-1">
              <button
                onClick={() => toggleOpen(item.key)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                title={collapsed ? t(item.title) : undefined}
              >
                <span className="flex items-center gap-2">
                  <Icon name={item.icon} />
                  {!collapsed ? <span>{t(item.title)}</span> : null}
                </span>

                {!collapsed ? <span className="text-zinc-400">{isOpen ? "▾" : "▸"}</span> : null}
              </button>

              {/* children only visible when NOT collapsed */}
              {!collapsed && isOpen ? (
                <div className="ml-2 pl-3 border-l">
                  {item.children.map((c) => {
                    if (c.children) {
                      const key = c.href;
                      const nestedOpen = !!open[key];
                      return (
                        <div key={c.title}>
                          <button
                            onClick={() => toggleOpen(key)}
                            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                          >
                            <span>{t(c.title)}</span>
                            <span className="text-zinc-400">{nestedOpen ? "▾" : "▸"}</span>
                          </button>
                          {nestedOpen ? (
                            <div className="ml-2 pl-3 border-l">
                              {c.children.map((cc) => (
                                <button
                                  key={cc.title}
                                  onClick={() => go(cc.href)}
                                  className={[
                                    "w-full text-left rounded-lg px-3 py-2 text-sm",
                                    pathname === cc.href
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "text-zinc-600 hover:bg-zinc-50",
                                  ].join(" ")}
                                >
                                  {t(cc.title)}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    const active = pathname === c.href;
                    return (
                      <button
                        key={c.title}
                        onClick={() => go(c.href)}
                        className={[
                          "w-full text-left rounded-lg px-3 py-2 text-sm",
                          active ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        <span className="flex items-center justify-between">
                          <span>{t(c.title)}</span>
                          {c.badge ? (
                            <span className="ml-2 rounded-full bg-red-100 text-red-600 text-[10px] px-2 py-0.5">
                              {c.badge}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Footer removed (logout removed as requested) */}
      <div className="shrink-0 border-t px-3 py-3 text-xs text-zinc-500">
        {!collapsed ? t("AIM Hygienic ERP") : "ERP"}
      </div>
    </aside>
  );
}