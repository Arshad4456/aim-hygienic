"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../services/apiClient";
import { buildOptionSets, computeSummary, createActivityFeed, defaultFilters, filterUsers } from "./utils";

export function useLiveTracking() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/location/live-users");
      const items = Array.isArray(res?.data?.items) ? res.data.items : [];
      setUsers(items);
      setLastLoadedAt(new Date().toISOString());
    } catch (e) {
      setError(e?.message || "Failed to load live users");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load({ silent: true }), 20000);
    return () => clearInterval(id);
  }, [load]);

  const filteredUsers = useMemo(() => filterUsers(users, filters), [users, filters]);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId("");
      return;
    }
    if (!selectedUserId || !filteredUsers.some((u) => String(u.userId) === String(selectedUserId))) {
      setSelectedUserId(String(filteredUsers[0].userId || ""));
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return filteredUsers[0] || null;
    return filteredUsers.find((u) => String(u.userId) === String(selectedUserId)) || filteredUsers[0] || null;
  }, [filteredUsers, selectedUserId]);

  const optionSets = useMemo(() => buildOptionSets(users), [users]);
  const summary = useMemo(() => computeSummary(filteredUsers), [filteredUsers]);
  const activityFeed = useMemo(() => createActivityFeed(filteredUsers), [filteredUsers]);

  return {
    loading,
    error,
    users,
    filters,
    setFilters,
    filteredUsers,
    selectedUser,
    selectedUserId,
    setSelectedUserId,
    optionSets,
    reload: load,
    summary,
    activityFeed,
    lastLoadedAt,
  };
}
