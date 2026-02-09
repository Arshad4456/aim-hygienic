"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { title: "Dashboard", href: "/dashboards/sales", icon: "📊" },
];

export default function SalesSidebar({ user, variant = "desktop", onClose }) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <div className="h-full w-[260px] border-r bg-white flex flex-col">
      <div className="px-4 py-4 border-b flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500">Sales Manager</div>
          <div className="text-sm font-semibold text-zinc-900">
            {user?.companyName || "Company"}
          </div>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-xs hover:bg-zinc-50"
          >
            ✕
          </button>
        ) : null}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                active
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t text-xs text-zinc-500">
        Signed in as {user?.fullName || "Sales Manager"}
      </div>
    </div>
  );
}