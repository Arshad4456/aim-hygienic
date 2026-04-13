"use client";

const KEYS = ["aim_token", "aim_role", "aim_user"];

function hasWindow() {
  return typeof window !== "undefined";
}

export function getAuthItem(key) {
  if (!hasWindow()) return null;
  const sessionValue = window.sessionStorage.getItem(key);
  if (sessionValue !== null) return sessionValue;
  return window.localStorage.getItem(key);
}

export function setAuthSession({ token, role, user }) {
  if (!hasWindow()) return;
  clearAuthStorage();
  window.sessionStorage.setItem("aim_token", token || "");
  window.sessionStorage.setItem("aim_role", role || "");
  window.sessionStorage.setItem("aim_user", JSON.stringify(user || {}));
}

export function clearAuthStorage() {
  if (!hasWindow()) return;
  KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });
}

export function getAuthUser() {
  const raw = getAuthItem("aim_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthRole() {
  return getAuthItem("aim_role") || getAuthUser()?.role || "";
}

export function decodeJwtPayload(token = "") {
  try {
    const value = String(token || "").split(".")[1];
    if (!value) return null;
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = typeof window !== "undefined"
      ? window.atob(normalized)
      : Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getAuthSnapshot() {
  const token = getAuthItem("aim_token") || "";
  const user = getAuthUser();
  const payload = decodeJwtPayload(token) || {};
  return {
    token,
    user,
    role: getAuthRole(),
    payload,
    companyId: user?.companyId || payload.companyId || "",
    companyName: user?.companyName || payload.companyName || "",
    distributorId: user?.distributorId || payload.distributorId || "",
  };
}
