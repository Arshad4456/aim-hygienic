"use client";
import { useMemo } from "react";
import { buildSidebarModules } from "../config/erpAccessMatrix";

export function useSidebar(user, visibleModules = []) {
  return useMemo(() => buildSidebarModules(user || {}, visibleModules || []), [user, visibleModules]);
}

export default useSidebar;
