import client from "../api/client";
export async function getRoles(params = {}) { const query = new URLSearchParams(params).toString(); return client.get(`/roles${query ? `?${query}` : ""}`); }
export async function getPortalModules(params = {}) { const query = new URLSearchParams(params).toString(); return client.get(`/portal-modules${query ? `?${query}` : ""}`); }
