"use client";

import Sidebar from "./Sidebar";

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
