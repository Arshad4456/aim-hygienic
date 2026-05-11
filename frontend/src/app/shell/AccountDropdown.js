"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPut } from "@/src/app/infrastructure/api/apiClient";
import { getCachedUser, logout, writeAuthCache } from "@/src/app/modules/platform/auth/services/authService";
import { getRolePortalProfile } from "@/src/app/config/erpAccessMatrix";
import { usePortalPreferences } from "@/src/app/context/PortalPreferences";

function initials(user = {}) {
  const name = user.fullName || user.username || user.role || "U";
  return String(name).split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span><div className="mt-1">{children}</div></label>;
}

function mergeCachedUser(patch = {}) {
  if (typeof window === "undefined") return;
  const cached = getCachedUser() || {};
  writeAuthCache(null, { ...cached, ...patch });
}

export default function AccountDropdown({ user }) {
  const router = useRouter();
  const profile = getRolePortalProfile(user || {});
  const { t, language, setLanguage, languageOptions, theme, setTheme, themeOptions } = usePortalPreferences();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || "", email: user?.email || "", mobile: user?.mobile || user?.mobileNumber || "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const cardRef = useRef(null);

  useEffect(() => {
    setProfileForm({ fullName: user?.fullName || "", email: user?.email || "", mobile: user?.mobile || user?.mobileNumber || "" });
  }, [user?.email, user?.fullName, user?.mobile, user?.mobileNumber]);

  useEffect(() => {
    function close(event) { if (cardRef.current && !cardRef.current.contains(event.target)) setOpen(false); }
    function closeEsc(event) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeEsc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeEsc);
    };
  }, []);

  async function saveProfile() {
    setNotice(""); setError("");
    try {
      const payload = await apiPut("/users/me", profileForm);
      const updatedUser = payload?.user ? { ...user, ...payload.user } : { ...user, ...profileForm };
      mergeCachedUser(updatedUser);
      setNotice(t("Profile updated."));
    } catch (err) {
      setError(err.message || "Unable to update profile");
    }
  }

  async function changePassword() {
    setNotice(""); setError("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError("New password and confirmation do not match."); return; }
    try {
      await apiPut("/users/change-password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice(t("Password changed successfully."));
    } catch (err) {
      setError(err.message || "Unable to change password");
    }
  }

  async function savePreferences(nextLanguage = language, nextTheme = theme) {
    setNotice(""); setError("");
    setLanguage(nextLanguage);
    setTheme(nextTheme);
    mergeCachedUser({ language: nextLanguage, theme: nextTheme });
    try {
      await apiPatch("/users/me/preferences", { language: nextLanguage, theme: nextTheme });
      setNotice(t("Preferences saved."));
    } catch (_err) {
      setNotice(t("Preferences saved."));
    }
  }

  function doLogout() {
    logout();
    if (typeof document !== "undefined") {
      document.cookie = "rawyan_token=; Max-Age=0; path=/";
      document.cookie = "rawyan_role=; Max-Age=0; path=/";
    }
    router.replace("/login");
  }

  return <div className="relative" ref={cardRef}>
    <button type="button" aria-expanded={open} aria-label={t("Account card")} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-emerald-200 sm:w-auto">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">{initials(user)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-slate-950">{user?.fullName || user?.username || t("ERP User")}</span>
        <span className="block truncate text-xs font-bold text-slate-500">{t(profile.label)} · {user?.companyName || t("System")}</span>
      </span>
      <span className="text-slate-400">▾</span>
    </button>

    {open ? <div className="absolute right-0 mt-3 w-[92vw] max-w-sm overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl sm:w-96">
      <div className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain">
        <div className="bg-gradient-to-r from-slate-950 to-emerald-700 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">{t("Account")}</p>
          <h3 className="mt-1 text-lg font-black">{user?.fullName || user?.username || t("ERP User")}</h3>
          <p className="text-xs text-white/75">{t(profile.label)} · {user?.companyName || t("System Admin")}</p>
          {user?.subscription?.planKey ? <span className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black">Plan: {user.subscription.planKey}</span> : null}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 text-sm font-bold">
          <button onClick={() => setMode(mode === "profile" ? "" : "profile")} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 hover:bg-emerald-50">{t("Profile Settings")}</button>
          <button onClick={() => setMode(mode === "password" ? "" : "password")} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 hover:bg-emerald-50">{t("Change Password")}</button>
          <button onClick={() => setMode(mode === "preferences" ? "" : "preferences")} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700 hover:bg-emerald-50">{t("Language / Theme")}</button>
          {profile.scope !== "system" ? <a href="/portals/company-control" className="rounded-xl bg-slate-50 px-3 py-2 text-center text-slate-700 hover:bg-emerald-50">{t("Company Control")}</a> : null}
          <button onClick={doLogout} className="rounded-xl bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100">{t("Logout")}</button>
        </div>
        {mode ? <div className="border-t border-slate-100 p-4">
          {mode === "profile" ? <div className="space-y-3">
            <Field label={t("Full name")}><input value={profileForm.fullName} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950" /></Field>
            <Field label={t("Email")}><input value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950" /></Field>
            <Field label={t("Mobile")}><input value={profileForm.mobile} onChange={(e) => setProfileForm((p) => ({ ...p, mobile: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950" /></Field>
            <button onClick={saveProfile} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Save Profile")}</button>
          </div> : null}
          {mode === "password" ? <div className="space-y-3">
            <Field label={t("Current password")}><input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950" /></Field>
            <Field label={t("New password")}><input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950" /></Field>
            <Field label={t("Confirm password")}><input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950" /></Field>
            <button onClick={changePassword} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">{t("Update Password")}</button>
          </div> : null}
          {mode === "preferences" ? <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Language")}><select value={language} onChange={(e) => savePreferences(e.target.value, theme)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950">{languageOptions.map((item) => <option key={item.code} value={item.code}>{t(item.label)}</option>)}</select></Field>
            <Field label={t("Theme")}><select value={theme} onChange={(e) => savePreferences(language, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950">{themeOptions.map((item) => <option key={item.code} value={item.code}>{t(item.label)}</option>)}</select></Field>
          </div> : null}
          {notice ? <p className="mt-3 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-3 rounded-xl bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p> : null}
        </div> : null}
      </div>
    </div> : null}
  </div>;
}
