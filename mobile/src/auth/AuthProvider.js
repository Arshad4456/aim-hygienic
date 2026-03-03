import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearSession, readToken, readUser, saveSession } from './secureStore';
import { loginApi, meApi } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
    (async () => {
      const t = await readToken();
      const u = await readUser();
      if (t) {
        setToken(t);
        setUser(u);
        try {
          const me = await meApi(t);
          setUser(me.user || u);
        } catch {
          await clearSession();
          setToken(null);
          setUser(null);
        }
      }
      setBooting(false);
    })();
  }, []);

  const login = async (mobile, password) => {
    const data = await loginApi(mobile, password);
    await saveSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user || null);
  };

  const logout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, booting, login, logout, isAuthed: Boolean(token) }), [token, user, booting]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthContext() {
  return useContext(Ctx);
}
