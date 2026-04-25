export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "reject", "print", "export"];
export const DEFAULT_PERMISSION_MATRIX = {
  admin: ["view", "create", "edit", "delete", "approve", "reject", "print", "export"],
  manager: ["view", "create", "edit", "approve", "print", "export"],
  operator: ["view", "create", "edit", "print"],
  viewer: ["view"],
};
export function hasPermission(userPermissions = {}, moduleKey, action = "view") {
  if (!moduleKey) return false;
  const key = String(moduleKey).replace(/-/g, "_");
  const allowed = userPermissions[moduleKey] || userPermissions[key] || [];
  return Array.isArray(allowed) && allowed.includes(action);
}
export default { PERMISSION_ACTIONS, DEFAULT_PERMISSION_MATRIX, hasPermission };
