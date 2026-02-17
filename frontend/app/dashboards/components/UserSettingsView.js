"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

export default function UserSettingsView({ titlePrefix }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch("/users/me");
        setUser(data.user || null);
      } catch (error) {
        setErr(error.message || "Failed to load account settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{titlePrefix} Account Settings</h1>
            <p className="text-sm text-zinc-500">Your profile data is read-only here.</p>
          </div>
          <Link href="./change-password" className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium hover:border-emerald-300 hover:bg-white">
            Change Password
          </Link>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">Loading...</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReadOnly label="Username" value={user?.username} />
            <ReadOnly label="Role" value={user?.role} />
            <ReadOnly label="Full Name" value={user?.fullName} />
            <ReadOnly label="Business Name" value={user?.businessName} />
            <ReadOnly label="Email" value={user?.email} />
            <ReadOnly label="Mobile" value={user?.mobile} />
            <div className="md:col-span-2">
              <ReadOnly label="Address" value={user?.address} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <div className="text-sm font-medium text-zinc-700">{label}</div>
      <div className="mt-1 rounded-xl border bg-zinc-50 px-3 py-2 text-sm text-zinc-900">{value || "-"}</div>
    </div>
  );
}