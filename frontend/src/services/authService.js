import apiClient from "./apiClient";

export const TOKEN_KEYS = ["rawyan_token"];
export const USER_KEYS = ["rawyan_user"];
export const ROLE_KEYS = ["rawyan_role"];

function hasWindow() {
  return typeof window !== "undefined";
}

function readStorage(keys) {
  if (!hasWindow()) return null;
  for (const storage of [window.sessionStorage, window.localStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) return value;
    }
  }
  return null;
}

export function getAuthItem(key) {
  if (!hasWindow()) return null;
  return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
}

export function writeAuthCache(token, user, { remember = true } = {}) {
  if (!hasWindow()) return;
  const target = remember ? window.localStorage : window.sessionStorage;
  if (token) target.setItem("rawyan_token", token);
  if (user) {
    const encoded = JSON.stringify(user || {});
    target.setItem("rawyan_user", encoded);
    target.setItem("rawyan_role", user?.role || user?.roleName || user?.roleKey || "");
    if (user?.language) window.localStorage.setItem("rawyan_language", user.language);
    if (user?.theme) window.localStorage.setItem("rawyan_theme", user.theme);
  }
}

export function setAuthSession({ token, role, user, remember = true } = {}) {
  if (!hasWindow()) return;
  logout();
  const target = remember ? window.localStorage : window.sessionStorage;
  if (token) target.setItem("rawyan_token", token);
  if (role || user?.role) target.setItem("rawyan_role", role || user?.role || "");
  if (user) {
    target.setItem("rawyan_user", JSON.stringify(user || {}));
    if (user?.language) window.localStorage.setItem("rawyan_language", user.language);
    if (user?.theme) window.localStorage.setItem("rawyan_theme", user.theme);
  }
}

export async function login(credentials) {
  const payload = await apiClient("/auth/login", { method: "POST", body: credentials });
  if (payload?.token) writeAuthCache(payload.token, payload.user || {});
  return payload;
}

export async function getMe() {
  const payload = await apiClient("/auth/me");
  if (payload?.user) writeAuthCache(null, payload.user);
  return payload;
}

export function getCachedUser() {
  if (!hasWindow()) return null;
  const raw = readStorage(USER_KEYS);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCachedRole() {
  return readStorage(ROLE_KEYS) || getCachedUser()?.role || "";
}

export function logout() {
  if (!hasWindow()) return;
  [...TOKEN_KEYS, ...USER_KEYS, ...ROLE_KEYS, "token", "authToken"].forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });
}
