"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/settings/regions", label: "Regions" },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("aim_user") || "null")
      : null;

  function logout() {
    localStorage.removeItem("aim_token");
    localStorage.removeItem("aim_user");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 border-r bg-white hidden md:block">
        <div className="p-4 font-bold text-lg">AIM ERP</div>
        <nav className="px-2 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "block rounded-xl px-3 py-2 text-sm",
                  active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1">
        <header className="h-14 border-b bg-white flex items-center justify-between px-4">
          <div className="text-sm text-gray-600">
            {user ? `${user.fullName} • ${user.role.toUpperCase()}` : "Admin Panel"}
          </div>
          <button
            onClick={logout}
            className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50"
          >
            Logout
          </button>
        </header>

        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}

