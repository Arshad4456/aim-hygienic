import { apiFetch } from "./api";

export const MODULE_ACCESS_ROLE_OPTIONS = [
  "admin",
  "system admin",
  "company admin",
  "warehouse manager",
  "brand manager",
  "distributor",
  "order booker",
  "customer",
];

export function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

export async function fetchModuleAccess(companyId = "") {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
  return apiFetch(`/module-access${query}`);
}

export function isRuleAllowedForRole(rule, role) {
  const allowedRoles = Array.isArray(rule?.allowedRoles) ? rule.allowedRoles.map(normalizeRole) : [];
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return true;
  if (!allowedRoles.length) return !rule?.locked;
  return allowedRoles.includes(normalizedRole);
}

export function getRuleByKey(rules = [], key = "") {
  return (rules || []).find((rule) => String(rule?.key || "") === String(key || "")) || null;
}

export function mapHrefToRuleKey(href = "") {
  const value = String(href || "").toLowerCase();
  if (value.includes("/primary-order-request") || value.includes("/brandmanager/orders")) return "order-management.primary";
  if (value.includes("/distributor/orders") || value.includes("/orderbooker/orders") || value.includes("/customer/orders")) return "order-management.secondary";
  if (value.includes("/return-stock")) return "order-management.return-stock";
  return "";
}
