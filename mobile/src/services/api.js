import axios from 'axios/dist/browser/axios.cjs';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/env';

const TOKEN_KEY = 'aim_erp_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const tokenStorage = {
  key: TOKEN_KEY,
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (value) => SecureStore.setItemAsync(TOKEN_KEY, value),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY)
};

export default api;
