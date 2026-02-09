"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SalesManagerShell({ children, user, title = "Sales Manager" }) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function logout() {
    localStorage.removeItem("aim_token");
    localStorage.removeItem("aim_role");
    localStorage.removeItem("aim_user");
    document.cookie = "aim_token=; Max-Age=0; path=/";
    document.cookie = "aim_role=; Max-Age=0; path=/";
    setUserMenuOpen(false);
    router.push("/login");
  }

  const initials = useMemo(() => {
    const name = user?.fullName || "Sales Manager";
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "S";
    const b = parts[1]?.[0] || "M";
    return (a + b).toUpperCase();
  }, [user]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="leading-tight">
            <div className="text-xs text-zinc-500">AIM Hygienic ERP</div>
            <div className="text-lg font-semibold text-zinc-900">{title}</div>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-zinc-50"
            >
              <div className="text-right hidden sm:block leading-tight">
                <div className="text-sm font-medium text-zinc-900">
                  {user?.fullName || "Sales Manager"}
                </div>
                <div className="text-xs text-zinc-500">
                  {user?.role || "sales_manager"} • {user?.company || "AIM Hygienic"}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-700 font-bold">{initials}</span>
              </div>
            </button>

            {userMenuOpen ? (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white p-2 shadow-lg">
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-zinc-900">
                    {user?.fullName || "Sales Manager"}
                  </div>
                  <div className="text-xs text-zinc-500">{user?.username || "sales"}</div>
                </div>

                <div className="h-px bg-zinc-100 my-1" />

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push("/dashboards/sales-manager");
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  Sales Dashboard
                </button>

                <div className="h-px bg-zinc-100 my-1" />

                <button
                  onClick={logout}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-50"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
