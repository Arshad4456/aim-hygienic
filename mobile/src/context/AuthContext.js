import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { get, post, registerUnauthorizedHandler, setAuthToken } from '../config/api';

const STORAGE_KEYS = {
  token: 'token',
  role: 'role',
  user: 'user',
};

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.token),
      SecureStore.deleteItemAsync(STORAGE_KEYS.role),
      SecureStore.deleteItemAsync(STORAGE_KEYS.user),
    ]);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(STORAGE_KEYS.token);
        const savedUser = await SecureStore.getItemAsync(STORAGE_KEYS.user);

        if (savedToken) {
          setToken(savedToken);
          setAuthToken(savedToken);
        }

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async ({ mobile, password }) => {
    const payload = {
      mobile: mobile.trim(),
      password,
    };

    const response = await post('/auth/login', payload);
    const nextToken = response?.token;
    const nextUser = response?.user;

    if (!nextToken || !nextUser) {
      throw new Error('Invalid login response from server.');
    }

    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEYS.token, nextToken),
      SecureStore.setItemAsync(STORAGE_KEYS.role, String(nextUser.role || '')),
      SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(nextUser)),
    ]);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const response = await get('/users/me');
    const nextUser = response?.user || response;

    if (nextUser) {
      setUser(nextUser);
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.role, String(nextUser.role || '')),
        SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(nextUser)),
      ]);
    }

    return nextUser;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
      refreshUser,
    }),
    [token, user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}