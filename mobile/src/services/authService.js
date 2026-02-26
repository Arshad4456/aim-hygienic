import api, { tokenStorage } from './api';

export async function login({ usernameOrEmail, password }) {
  const { data } = await api.post('/api/auth/login', {
    email: usernameOrEmail,
    password
  });

  if (data?.token) {
    await tokenStorage.set(data.token);
  }

  return data;
}

export async function logout() {
  await tokenStorage.clear();
}

export async function getCurrentProfile() {
  const { data } = await api.get('/api/auth/me');
  return data;
}
