"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function UserDashboardShell({ title, subtitle, roleKey, links = [] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return links;
    return links.filter((item) => item.title.toLowerCase().includes(value));
  }, [query, links]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-zinc-50 px-4 py-5 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 shadow-sm p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">AIM Hygienic Dashboard</div>
              <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{title}</h1>
              <p className="text-sm text-zinc-500">{subtitle}</p>
            </div>

            <div className="relative w-full md:w-[360px]">
              <input
                value={query}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                placeholder="Search this dashboard..."
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {open ? (
                <div className="absolute z-20 mt-1 w-full rounded-2xl border bg-white shadow-lg max-h-64 overflow-y-auto">
                  {filtered.length ? (
                    filtered.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => router.push(item.href)}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        {item.title}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-zinc-500">No match found.</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border bg-zinc-50/70 p-4">
            <div className="text-sm text-zinc-600">Signed in role</div>
            <div className="text-base font-semibold text-zinc-900">{roleKey}</div>
          </div>
        </div>
      </div>
    </div>
  );
}