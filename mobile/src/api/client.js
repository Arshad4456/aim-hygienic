import { API_BASE_URL } from '../app/config';
import { readToken } from '../auth/secureStore';

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) { unauthorizedHandler = fn; }

const BASE_URL = API_BASE_URL ? (API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`) : '/api';
export { BASE_URL };

export async function apiClient(path, { method = 'GET', body, token } = {}) {
  const authToken = token || (await readToken());
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }
  return data;
}
