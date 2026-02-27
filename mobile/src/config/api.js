import Constants from 'expo-constants';

const configBaseUrl = Constants?.expoConfig?.extra?.apiBaseUrl;
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const rawBaseUrl = (configBaseUrl || envBaseUrl || '').trim();
const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
}

export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

function resolveUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const hasApiPrefix = /\/api$/i.test(API_BASE_URL);
  const baseWithApi = hasApiPrefix ? API_BASE_URL : `${API_BASE_URL}/api`;

  return `${baseWithApi}${normalizedPath}`;
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL configuration.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(resolveUrl(path), {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (response.status === 401 && onUnauthorized) {
    await onUnauthorized();
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export function post(path, body, options = {}) {
  return apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export function get(path, options = {}) {
  return apiRequest(path, {
    method: 'GET',
    ...options,
  });
}
