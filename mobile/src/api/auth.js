import apiClient from './client';
import { endpoints } from './endpoints';

export async function loginWithMobile({ mobile, password }) {
  const { data } = await apiClient.post(endpoints.auth.login, {
    mobile: mobile.trim(),
    password,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get(endpoints.auth.me);
  return data;
}