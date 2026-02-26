import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { getCurrentProfile, login as loginApi, logout as logoutApi } from '../services/authService';
import { tokenStorage } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const existingToken = await tokenStorage.get();
      if (!existingToken) {
        return;
      }

      setToken(existingToken);
      const profile = await getCurrentProfile();
      setUser(profile?.user ?? profile);
    } catch (error) {
      await tokenStorage.clear();
      setToken(null);
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (credentials) => {
    try {
      const data = await loginApi(credentials);
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch (error) {
      Alert.alert('Login failed', error?.response?.data?.message || 'Invalid credentials.');
      return { ok: false };
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      isAuthenticated: Boolean(token && user),
      login,
      logout
    }),
    [initializing, login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}