"use client";
import { hasPermission } from "../../lib/permissions";
export default function Can({ user, permissions, moduleKey, action = "view", children, fallback = null }) { const p = permissions || user?.permissions || {}; return hasPermission(p, moduleKey, action) ? children : fallback; }
