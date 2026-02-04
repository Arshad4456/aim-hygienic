"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import AdminShell from "../components/AdminShell";

export default function AdminDynamicModulePage() {
  const pathname = usePathname();

  const title = useMemo(() => {
    // e.g. /dashboards/admin/products/add -> "Products / Add"
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("admin");
    const rest = idx >= 0 ? parts.slice(idx + 1) : parts;
    if (!rest.length) return "Module";
    return rest.map((s) => s.replace(/-/g, " ")).map(cap).join(" / ");
  }, [pathname]);

  return (
    <AdminShell title={title} user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">{title}</div>
        <div className="text-sm text-zinc-500 mt-2">
          This page is working via dynamic route.
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="font-semibold text-zinc-900">Next step</div>
            <div className="text-sm text-zinc-600 mt-1">
              We will implement real UI + API for this module.
            </div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="font-semibold text-zinc-900">Path</div>
            <div className="text-sm text-zinc-600 mt-1">{pathname}</div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function cap(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
