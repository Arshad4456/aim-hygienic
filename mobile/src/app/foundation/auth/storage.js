import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'aim_token';
const USER_KEY = 'aim_user';
const ROLE_KEY = 'aim_role';

export async function saveSession({ token, user, role }) {
  await SecureStore.setItemAsync(TOKEN_KEY, token || '');
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user || {}));
  await SecureStore.setItemAsync(ROLE_KEY, role || '');
}

export async function loadSession() {
  const [token, userRaw, role] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(ROLE_KEY),
  ]);

  const user = userRaw ? JSON.parse(userRaw) : null;
  return { token, user, role };
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(ROLE_KEY),
  ]);
}