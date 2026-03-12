"use client";

import { apiFetch } from "./api";

const STORAGE_KEY = "aim_runtime_dashboard_v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

export async function fetchRuntimeDashboard() {
  const data = await apiFetch("/runtime/dashboard");
  if (!data?.dashboard) throw new Error("Invalid runtime dashboard response");

  if (canUseStorage()) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.dashboard));
  }

  return data.dashboard;
}

export function getRuntimeDashboard() {
  if (!canUseStorage()) return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

export function clearRuntimeDashboard() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
