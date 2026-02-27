import axios from 'axios';
import Constants from 'expo-constants';
import { clearSession } from '../auth/storage';

function normalizeApiBase(inputBase) {
  const trimmed = String(inputBase || '').trim().replace(/\/$/, '');
  if (!trimmed) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL. Set it in your environment.');
  }
  return /\/api(\/|$)/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || Constants?.expoConfig?.extra?.apiBaseUrl;
const baseURL = normalizeApiBase(envBase);

let getToken = async () => null;
let onUnauthorized = async () => {};

export function configureApiClient({ tokenProvider, unauthorizedHandler }) {
  getToken = tokenProvider;
  onUnauthorized = unauthorizedHandler;
}

const apiClient = axios.create({
  baseURL,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  const nextConfig = { ...config, headers: { ...(config.headers || {}) } };

  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  const data = nextConfig.data;
  if (data && !(data instanceof FormData) && !nextConfig.headers['Content-Type']) {
    nextConfig.headers['Content-Type'] = 'application/json';
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Request failed';

    if (status === 401) {
      await clearSession();
      await onUnauthorized();
    }

    return Promise.reject(new Error(message));
  }
);

export async function uploadFileToPresignedUrl(uploadUrl, fileBlob, contentType = 'application/octet-stream') {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: fileBlob,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }

  return true;
}

export default apiClient;