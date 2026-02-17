"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";

const rules = ["At least 8 characters", "One capital letter", "One number", "One symbol"];

function validatePassword(value) {
  if (!value || value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(value)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one symbol.";
  return "";
}

export default function UserChangePasswordView({ titlePrefix }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    const error = validatePassword(form.newPassword);
    if (error) {
      setErr(error);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setErr("New password and confirm password must match.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/users/change-password", {
        method: "PUT",
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setOk("✅ Password updated successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error2) {
      setErr(error2.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">{titlePrefix} Change Password</h1>
        <p className="text-sm text-zinc-500 mt-1">Use a strong password to secure your account.</p>

        <div className="mt-4 rounded-xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <div className="font-medium text-zinc-800">Password rules</div>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <PasswordField label="Current Password" value={form.currentPassword} show={show.current} onToggle={() => setShow((s) => ({ ...s, current: !s.current }))} onChange={(v) => setField("currentPassword", v)} />
          <PasswordField label="New Password" value={form.newPassword} show={show.next} onToggle={() => setShow((s) => ({ ...s, next: !s.next }))} onChange={(v) => setField("newPassword", v)} />
          <PasswordField label="Confirm New Password" value={form.confirmPassword} show={show.confirm} onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} onChange={(v) => setField("confirmPassword", v)} />

          <button disabled={saving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 w-fit">
            {saving ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <div className="text-sm font-medium text-zinc-800">{label}</div>
      <div className="relative">
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 pr-12 outline-none focus:ring-2 focus:ring-emerald-200" />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700">{show ? "Hide" : "Show"}</button>
      </div>
    </div>
  );
}
