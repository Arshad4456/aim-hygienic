"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import { defaultFilters, filterUsers } from "./utils";

export function useLiveTracking() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedUserId, setSelectedUserId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await apiFetch("/location/live-users");
      setUsers(Array.isArray(res?.data?.items) ? res.data.items : []);
    } catch (e) {
      setError(e?.message || "Failed to load live users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const filteredUsers = useMemo(() => filterUsers(users, filters), [users, filters]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return filteredUsers[0] || null;
    return filteredUsers.find((u) => String(u.userId) === String(selectedUserId)) || filteredUsers[0] || null;
  }, [filteredUsers, selectedUserId]);

  const optionSets = useMemo(() => {
    function pick(key) {
      return [...new Set(users.map((u) => String(u?.[key] || "").trim()).filter(Boolean))].sort();
    }
    return {
      roles: [...new Set(users.map((u) => String(u.role || "").trim().toLowerCase().replace(/\s+/g, " ")).filter(Boolean))].sort(),
      companies: pick("companyId"),
      distributors: pick("distributorId"),
      regions: pick("regionName"),
      zones: pick("zoneName"),
      territories: pick("territoryName"),
      fields: pick("fieldName"),
    };
  }, [users]);

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
  };
}
