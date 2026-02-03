"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { roleToDashboard, saveAuth } from "../lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => username.trim() && password.trim(), [username, password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials true is only needed if you later switch to httpOnly cookies
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setErr(data.message || "Login failed");
        setLoading(false);
        return;
      }

      saveAuth(data.token, data.user);
      router.push(roleToDashboard(data.user.role));
    } catch (e) {
      setErr("Network error: API not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border">
        <div className="px-6 py-6 border-b">
          <div className="text-2xl font-semibold text-zinc-900">AIM Hygienic ERP</div>
          <div className="text-sm text-zinc-500 mt-1">Sign in to continue</div>
        </div>

        <form onSubmit={onSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700">Username</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <button
            disabled={!canSubmit || loading}
            className="w-full rounded-xl bg-emerald-600 text-white py-2 font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="text-xs text-zinc-500 pt-2 border-t">
            API: <span className="font-mono">{API_BASE}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
