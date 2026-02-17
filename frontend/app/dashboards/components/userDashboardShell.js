"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAuthStorage, getAuthItem } from "../../lib/clientAuth";

export default function UserDashboardShell({ title, subtitle, roleKey, links = [], showAccountCards = false }) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${title} | AIM Hygienic`;
    }
  }, [title]);

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

  const roleSlug = useMemo(() => {
    if (!roleKey) return "";
    if (roleKey === "Brand Manager") return "brandManager";
    if (roleKey === "Distributor") return "distributor";
    return "";
  }, [roleKey]);

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

  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[300px] bg-white shadow-xl">
            <UserSidebar title={title} roleKey={roleKey} links={moduleLinks} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="hidden md:flex">
        <UserSidebar title={title} roleKey={roleKey} links={moduleLinks} />
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

              <div className="leading-tight">
                <div className="text-xs text-zinc-500">AIM Hygienic ERP</div>
                <div className="text-lg font-semibold text-zinc-900">{title}</div>
                <div className="text-xs text-zinc-500">{subtitle}</div>
              </div>
            </div>

            <div className="flex w-full md:w-auto items-center gap-3">
              <div className="relative w-full max-w-[380px]">
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
                  <div className="text-right hidden sm:block leading-tight">
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
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm text-zinc-600">Signed in role</div>
            <div className="text-base font-semibold text-zinc-900">{roleKey}</div>
          </div>

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
        </main>
      </div>
    </div>
  );
}

function UserSidebar({ title, roleKey, links, onNavigate }) {
  const router = useRouter();

  function go(href) {
    router.push(href);
    if (onNavigate) onNavigate();
  }

  return (
    <aside className="h-screen w-[290px] border-r bg-white flex flex-col">
      <div className="px-4 py-4 border-b">
        <div className="text-xs text-zinc-500">AIM Hygienic Dashboard</div>
        <div className="font-semibold text-zinc-900">{roleKey}</div>
        <div className="text-xs text-zinc-500 mt-1 truncate">{title}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {links.map((item) => (
          <button
            key={`side-${item.href}`}
            type="button"
            onClick={() => go(item.href)}
            className="w-full text-left rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 hover:border-emerald-300 hover:bg-white mb-2"
          >
            {item.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
