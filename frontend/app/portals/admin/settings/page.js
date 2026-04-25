"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function AccountSettingsPage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/users/me");
        setUser(data.user);
        setForm({
          fullName: data.user?.fullName || "",
          email: data.user?.email || "",
          mobile: data.user?.mobile || "",
          address: data.user?.address || "",
        });
      } catch (e) {
        setErr(e.message || "Failed to load account");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const data = await apiFetch("/users/me", { method: "PUT", body: form });
      setUser(data.user);
      setOk("✅ Account updated.");
    } catch (e) {
      setErr(e.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Account Settings" user={user}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Account Settings</div>
        <div className="text-sm text-zinc-500 mt-1">Review and update your profile details.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-6 text-sm text-zinc-500">Loading...</div>
        ) : (
          <form onSubmit={onSave} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" value={form.fullName} onChange={(v) => setField("fullName", v)} required />
            <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} type="email" />
            <Field label="Mobile Number" value={form.mobile} onChange={(v) => setField("mobile", v)} />
            <div className="md:col-span-2">
              <Label>Address</Label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                rows={3}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 mt-2">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}