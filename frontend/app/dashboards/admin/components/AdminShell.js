"use client";

import Sidebar from "./Sidebar";
cat > app/dashboards/components/AdminShell.js <<'EOF'
"use client";

import Sidebar from "./Sidebar";

export default function AdminShell({ title = "Dashboard", children }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex">
        <Sidebar />

        <main className="flex-1">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 border-b bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
                <p className="text-xs text-zinc-500">AIM Hygienic ERP</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-zinc-500">admin</span>
                <div className="h-9 w-9 rounded-full bg-emerald-100 grid place-items-center text-emerald-700 font-semibold">
                  A
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
EOF

export default function AdminShell({ children, user }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <Sidebar user={user} />

      <main className="flex-1">
        <div className="px-4 md:px-6 py-5">
          {children}
        </div>
      </main>
    </div>
  );
}
