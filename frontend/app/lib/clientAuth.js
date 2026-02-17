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
