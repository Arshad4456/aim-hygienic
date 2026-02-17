"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthStorage, getAuthItem } from "../../lib/clientAuth";

const iconStyles = "h-5 w-5 shrink-0";

function ModuleIcon({ name }) {
  const key = String(name || "").toLowerCase();

  if (key.includes("dashboard") || key.includes("overview")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconStyles}>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
      </svg>
    );
  }

  if (key.includes("message")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconStyles}>
        <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 3V6a1 1 0 0 1 1-1Z" />
      </svg>
    );
  }

  if (key.includes("setting") || key.includes("password")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconStyles}>
        <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.02.02a2 2 0 1 1-2.82 2.82l-.02-.02a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.05 1.56V21a2 2 0 1 1-4 0v-.03a1.7 1.7 0 0 0-1.05-1.56 1.7 1.7 0 0 0-1.87.34l-.02.02a2 2 0 0 1-2.82-2.82l.02-.02A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.05H3a2 2 0 1 1 0-4h.03A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.02-.02a2 2 0 1 1 2.82-2.82l.02.02A1.7 1.7 0 0 0 8.95 4.6a1.7 1.7 0 0 0 1.05-1.56V3a2 2 0 1 1 4 0v.03a1.7 1.7 0 0 0 1.05 1.56 1.7 1.7 0 0 0 1.87-.34l.02-.02a2 2 0 1 1 2.82 2.82l-.02.02A1.7 1.7 0 0 0 19.4 8.9c.14.32.22.66.22 1.01 0 .35-.08.69-.22 1.01" />
      </svg>
    );
  }

  if (key.includes("return")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconStyles}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 1 1 0 12h-2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconStyles}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12h8M8 8h8M8 16h5" />
    </svg>
  );
}

function humanize(segment = "") {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function deriveRoleSlug(links, roleKey) {
  const roleLink = links.find((item) => item.href?.startsWith("/dashboards/") && item.href !== "/dashboards");
  if (roleLink) {
    const parts = roleLink.href.split("/").filter(Boolean);
    if (parts[0] === "dashboards" && parts[1] && parts[1] !== "admin") return parts[1];
  }

  if (roleKey === "Brand Manager") return "brandManager";
  if (roleKey === "Distributor") return "distributor";
  return "";
}

let userSidebarOpenGroupsCache = {};

export default function UserDashboardShell({ title, subtitle, roleKey, links = [], showAccountCards = false, children = null }) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("aim_user_sidebar_collapsed") === "1";
  });
  const roleSlug = useMemo(() => deriveRoleSlug(links, roleKey), [links, roleKey]);
  const sidebarCacheKey = roleSlug || roleKey || "default";
  const [openGroups, setOpenGroups] = useState(() => userSidebarOpenGroupsCache[sidebarCacheKey] || {});
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${title} | AIM Hygienic`;
    }
  }, [title]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("aim_user_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const user = useMemo(() => {
    const raw = getAuthItem("aim_user");
    return raw ? JSON.parse(raw) : null;
  }, []);

  function logout() {
    if (typeof window !== "undefined") {
      clearAuthStorage();
      document.cookie = "aim_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "aim_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    setMenuOpen(false);
    setMobileOpen(false);
    router.push("/login");
  }

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return links;
    return links.filter((item) => item.title.toLowerCase().includes(value));
  }, [query, links]);

  const settingsHref = roleSlug ? `/dashboards/${roleSlug}/settings` : "/dashboards/admin/settings";
  const changePasswordHref = roleSlug ? `/dashboards/${roleSlug}/settings/change-password` : "/dashboards/admin/settings/change-password";

  const userInitials = useMemo(() => {
    const source = user?.fullName || roleKey || "User";
    const parts = source.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || "D";
    return `${first}${second}`.toUpperCase();
  }, [user, roleKey]);

  const moduleLinks = useMemo(
    () => links.filter((item) => !/account settings|change password/i.test(item.title)),
    [links],
  );


  useEffect(() => {
    userSidebarOpenGroupsCache = {
      ...userSidebarOpenGroupsCache,
      [sidebarCacheKey]: openGroups,
    };
  }, [openGroups, sidebarCacheKey]);

  const moduleGroups = useMemo(() => {
    const grouped = [];

    moduleLinks.forEach((item) => {
      const tokens = item.href.split("/").filter(Boolean);
      const roleIndex = tokens.findIndex((token) => token === roleSlug);
      const next = roleIndex >= 0 ? tokens[roleIndex + 1] : null;

      const groupKey = !next ? "dashboard" : next;
      const existing = grouped.find((g) => g.key === groupKey);

      if (existing) {
        existing.items.push(item);
        return;
      }

      grouped.push({
        key: groupKey,
        title: groupKey === "dashboard" ? "Dashboard" : humanize(groupKey),
        iconName: groupKey,
        items: [item],
      });
    });

    return grouped;
  }, [moduleLinks, roleSlug]);


  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] bg-white shadow-xl">
            <UserSidebar
              title={title}
              roleKey={roleKey}
              groups={moduleGroups}
              pathname={pathname}
              openGroups={openGroups}
              setOpenGroups={setOpenGroups}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="hidden md:flex h-screen">
        <UserSidebar
          title={title}
          roleKey={roleKey}
          groups={moduleGroups}
          pathname={pathname}
          openGroups={openGroups}
          setOpenGroups={setOpenGroups}
          collapsed={collapsed}
        />
      </div>

      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        <div className="shrink-0 border-b bg-white">
          <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
              >
                ☰
              </button>

              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="hidden md:inline-flex rounded-xl px-3 py-2 text-sm hover:bg-zinc-50"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                ☰
              </button>

              <div className="leading-tight">
                <div className="text-xs text-zinc-500">AIM HYGIENICS (PVT) LIMITED</div>
                <div className="text-lg font-semibold text-zinc-900">{title}</div>
              </div>
            </div>

            <div className="flex w-full md:w-auto md:min-w-[520px] md:justify-end md:flex-nowrap items-center gap-3">
              <div className="relative w-full md:min-w-[300px] md:max-w-[300px]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search this dashboard..."
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {query ? (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border bg-white shadow-lg max-h-64 overflow-y-auto">
                    {filtered.length ? (
                      filtered.map((item) => (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => {
                            setQuery(item.title);
                            router.push(item.href);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          {item.title}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-zinc-500">No match found.</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-2xl hover:bg-zinc-50 px-2 py-1.5"
                >
                  <div className="text-right hidden sm:block leading-tight whitespace-nowrap">
                    <div className="text-sm font-medium text-zinc-900">{user?.fullName || roleKey}</div>
                    <div className="text-xs text-zinc-500">{user?.role || roleKey}</div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-700 font-bold">{userInitials}</span>
                  </div>
                </button>

                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-lg p-2 z-50">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(settingsHref);
                      }}
                      className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      Account Settings
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push(changePasswordHref);
                      }}
                      className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      Change Password
                    </button>

                    <div className="h-px bg-zinc-100 my-1" />

                    <button
                      onClick={logout}
                      className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-zinc-50 text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
          {children ? children : (
            <>
              {showAccountCards ? (
                <div className="mt-4 rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-zinc-900">Quick Actions</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Link href={settingsHref} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 hover:border-emerald-300 hover:bg-white">
                      Account Settings
                    </Link>
                    <Link href={changePasswordHref} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 hover:border-emerald-300 hover:bg-white">
                      Change Password
                    </Link>
                    <button type="button" onClick={logout} className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 hover:bg-red-100">
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border bg-white p-4">
                <div className="text-sm font-semibold text-zinc-900">Modules</div>
                <div className="mt-1 text-xs text-zinc-500">Navigate all pages assigned to this dashboard.</div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {moduleLinks.map((item) => (
                    <Link
                      key={`nav-${item.href}`}
                      href={item.href}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 hover:border-emerald-300 hover:bg-white"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function UserSidebar({ title, roleKey, groups, pathname, openGroups, setOpenGroups, collapsed, onNavigate }) {
  const router = useRouter();

  function go(href) {
    router.push(href);
    if (onNavigate) onNavigate();
  }

  return (
    <aside className={["h-screen border-r bg-white flex flex-col", collapsed ? "w-[70px]" : "w-[220px]"].join(" ")}>
      <div className={["px-3 py-[15px] flex flex-col items-center gap-0", collapsed ? "border-b" : ""].join(" ")}>
        <div className="h-11 w-11 rounded-md bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">AH</div>
        {!collapsed ? (<><div className="text-[11px] font-medium text-zinc-600 text-center">AIM</div></>) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groups.map((group) => {
          const active = group.items.some((item) => pathname === item.href);
          const isOpen = openGroups[group.key] ?? false;
          return (
            <div key={group.key} className="rounded-xl border border-zinc-200 bg-zinc-50">
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    go(group.items[0].href);
                  } else {
                    setOpenGroups((prev) => {
                      const isCurrentlyOpen = prev[group.key] ?? false;
                      if (isCurrentlyOpen) return { ...prev, [group.key]: false };

                      const next = {};
                      groups.forEach((entry) => {
                        next[entry.key] = false;
                      });
                      next[group.key] = true;
                      return next;
                    });
                  }
                }}
                className={[
                  "w-full flex items-center gap-2 px-3 py-2 text-sm",
                  active ? "text-emerald-700" : "text-zinc-800",
                  collapsed ? "justify-center" : "justify-center",
                ].join(" ")}
                title={group.title}
              >
                <div className="flex items-center gap-2 min-w-0 justify-center">
                  <ModuleIcon name={group.iconName} />
                  {!collapsed ? <span className="truncate text-center">{group.title}</span> : null}
                </div>
                {!collapsed ? <span className="text-xs text-zinc-500 ml-1">{isOpen ? "▾" : "▸"}</span> : null}
              </button>

              {!collapsed && isOpen ? (
                <div className="px-2 pb-2 space-y-1">
                  {group.items.map((item) => {
                    const itemActive = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => go(item.href)}
                        className={[
                          "w-full rounded-lg px-3 py-2 text-sm text-center",
                          itemActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "text-zinc-700 hover:bg-white",
                        ].join(" ")}
                      >
                        {item.title}
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