import { resolveRoleDefinition } from "./roleRegistry";

export const TOKEN_KEY = "aim_token_v1";
export const USER_KEY = "aim_user_v1";

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  const user = userRaw ? JSON.parse(userRaw) : null;
  return { token, user };
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function roleToDashboard(role) {
  return resolveRoleDefinition(role).dashboardPath || "/portals/admin";
}