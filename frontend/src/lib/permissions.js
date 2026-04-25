export function hasPermission(permissions = {}, moduleKey, action = "view") {
  if (!moduleKey) return false;
  if (permissions === "*" || permissions?.["*"] || permissions?.superAdmin) return true;
  const value = permissions?.[moduleKey];
  if (!value) return false;
  if (value === "*") return true;
  if (Array.isArray(value)) return value.includes(action) || value.includes("*");
  if (typeof value === "object") return Boolean(value[action] || value["*"]);
  return Boolean(value);
}
export function canViewModule(permissions = {}, moduleKey) { return hasPermission(permissions, moduleKey, "view"); }
