import apiClient from "./apiClient";
export async function login(credentials) { const payload = await apiClient("/auth/login", { method: "POST", body: JSON.stringify(credentials) }); if (typeof window !== "undefined" && payload.token) { localStorage.setItem("rawyan_token", payload.token); localStorage.setItem("rawyan_user", JSON.stringify(payload.user || {})); } return payload; }
export async function getMe() { return apiClient("/auth/me"); }
export function getCachedUser() { if (typeof window === "undefined") return null; try { return JSON.parse(localStorage.getItem("rawyan_user") || "null"); } catch { return null; } }
export function logout() { if (typeof window !== "undefined") { localStorage.removeItem("rawyan_token"); localStorage.removeItem("rawyan_user"); } }
