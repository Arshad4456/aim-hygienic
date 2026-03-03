import { apiClient } from './client';

export function loginApi(mobile, password) {
  return apiClient('/auth/login', { method: 'POST', body: { mobile: String(mobile || '').trim(), password } });
}

export function meApi(token) {
  return apiClient('/auth/me', { token });
}

export function logoutApi() {
  return apiClient('/auth/logout', { method: 'POST' });
}
