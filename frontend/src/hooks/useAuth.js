"use client";
import { useEffect, useState } from "react";
import { getCachedUser, getMe } from "../services/authService";
export function useAuth() { const [state, setState] = useState({ user: getCachedUser(), visibleModules: [], loading: true, error: null }); useEffect(() => { let alive = true; getMe().then((payload) => { if (alive) setState({ user: payload.user, visibleModules: payload.visibleModules || [], loading: false, error: null }); }).catch((error) => { if (alive) setState((s) => ({ ...s, loading: false, error })); }); return () => { alive = false; }; }, []); return state; }
export default useAuth;
