"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import { fetchModuleAccess, MODULE_ACCESS_ROLE_OPTIONS, normalizeRole } from "../../../lib/moduleAccess";
import { getAuthItem } from "../../../lib/clientAuth";

function humanizeModuleKey(value = "") {
  return String(value || "other")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ModuleAccessPage() {
  const [rules, setRules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedModuleKey, setSelectedModuleKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originalRules, setOriginalRules] = useState([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral");
  const [dirty, setDirty] = useState(false);

  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    return JSON.parse(getAuthItem("aim_user") || "null");
  }, []);
  const isSystemAdmin = ["admin", "system admin"].includes(normalizeRole(user?.role));

  useEffect(() => {
    setMounted(true);
  }, []);

  const groupedRules = useMemo(() => {
    const groups = new Map();
    (rules || []).forEach((rule) => {
      const groupKey = String(rule?.moduleKey || "other");
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(rule);
    });
    return Array.from(groups.entries())
      .map(([moduleKey, items]) => ({
        moduleKey,
        items: items.sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || ""))),
      }))
      .sort((a, b) => humanizeModuleKey(a.moduleKey).localeCompare(humanizeModuleKey(b.moduleKey)));
  }, [rules]);

  const selectedGroup = useMemo(
    () => groupedRules.find((group) => group.moduleKey === selectedModuleKey) || groupedRules[0] || null,
    [groupedRules, selectedModuleKey]
  );

  useEffect(() => {
    if (!selectedModuleKey && groupedRules.length) {
      setSelectedModuleKey(groupedRules[0].moduleKey);
      return;
    }
    if (selectedModuleKey && !groupedRules.some((group) => group.moduleKey === selectedModuleKey) && groupedRules.length) {
      setSelectedModuleKey(groupedRules[0].moduleKey);
    }
  }, [groupedRules, selectedModuleKey]);

  useEffect(() => {
    let active = true;
    async function loadCompanies() {
      if (!isSystemAdmin) return;
      const data = await apiFetch("/companies");
      if (!active) return;
      const companyItems = Array.isArray(data?.companies) ? data.companies : [];
      setCompanies(companyItems);
      const defaultCompanyId = user?.companyId || companyItems?.[0]?.companyId || "";
      const defaultCompany = companyItems.find((item) => item.companyId === defaultCompanyId);
      setCompanyId(defaultCompanyId);
      setCompanyName(defaultCompany?.name || user?.companyName || "");
    }
    loadCompanies().catch(() => {
      if (!active) return;
      setMessage("Failed to load companies.");
      setMessageTone("error");
    });
    return () => {
      active = false;
    };
  }, [isSystemAdmin, user?.companyId, user?.companyName]);

  useEffect(() => {
    const scopedCompanyId = isSystemAdmin ? companyId : user?.companyId;
    if (!scopedCompanyId) return;
    setLoading(true);
    fetchModuleAccess(scopedCompanyId)
      .then((data) => {
        const loadedRules = Array.isArray(data?.rules) ? data.rules : [];
        setRules(loadedRules);
        setOriginalRules(loadedRules);
        setCompanyName(data?.companyName || companyName || user?.companyName || "");
        setDirty(false);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error.message || "Failed to load access configuration");
        setMessageTone("error");
      })
      .finally(() => setLoading(false));
  }, [companyId, companyName, isSystemAdmin, user?.companyId, user?.companyName]);

  function updateRule(ruleKey, updater) {
    setRules((current) => current.map((rule) => (rule.key === ruleKey ? updater(rule) : rule)));
    setDirty(true);
    setMessage("");
  }

  function toggleRole(ruleKey, roleValue) {
    updateRule(ruleKey, (rule) => {
      const allowedRoles = Array.isArray(rule.allowedRoles) ? [...rule.allowedRoles] : [];
      const normalized = normalizeRole(roleValue);
      const exists = allowedRoles.includes(normalized);
      return {
        ...rule,
        locked: true,
        allowedRoles: exists ? allowedRoles.filter((item) => item !== normalized) : [...allowedRoles, normalized],
      };
    });
  }

  function applyRoleToSelectedModule(roleValue, shouldAllow) {
    if (!selectedGroup) return;
    const normalized = normalizeRole(roleValue);
    setRules((current) =>
      current.map((rule) => {
        if (rule.moduleKey !== selectedGroup.moduleKey) return rule;
        const allowedRoles = Array.isArray(rule.allowedRoles) ? [...rule.allowedRoles] : [];
        const nextAllowed = shouldAllow
          ? Array.from(new Set([...allowedRoles, normalized]))
          : allowedRoles.filter((item) => item !== normalized);
        return { ...rule, locked: true, allowedRoles: nextAllowed };
      })
    );
    setDirty(true);
    setMessage("");
  }

  function resetSelectedModuleToDefaults() {
    if (!selectedGroup) return;
    setRules((current) =>
      current.map((rule) => {
        if (rule.moduleKey !== selectedGroup.moduleKey) return rule;
        const matched = (originalRules || []).find((item) => item.key === rule.key);
        return matched ? { ...matched } : rule;
      })
    );
    setDirty(true);
    setMessage("");
  }

  async function saveChanges() {
    const scopedCompanyId = isSystemAdmin ? companyId : user?.companyId;
    const scopedCompanyName = isSystemAdmin ? companyName : user?.companyName;
    if (!scopedCompanyId) return;
    setSaving(true);
    setMessage("");
    try {
      const data = await apiFetch("/module-access", {
        method: "PUT",
        body: {
          companyId: scopedCompanyId,
          companyName: scopedCompanyName,
          rules,
        },
      });
      const refreshed = await fetchModuleAccess(scopedCompanyId);
      const refreshedRules = Array.isArray(refreshed?.rules) ? refreshed.rules : data?.config?.rules || rules;
      setRules(refreshedRules);
      setOriginalRules(refreshedRules);
      setDirty(false);
      setMessageTone("success");
      setMessage("Access control saved successfully.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error.message || "Failed to save access control");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) {
    return (
      <AdminShell title="Module Access Control" user={null}>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">Loading access control...</div>
      </AdminShell>
    );
  }

  if (!isSystemAdmin) {
    return (
      <AdminShell title="Module Access Control" user={null}>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          Only Admin or System Admin can manage module access control.
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Module Access Control" user={null}>
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Module and section lock control</div>
            <div className="mt-1 max-w-4xl text-sm text-zinc-500">
              Select one module card from the horizontal strip, then manage its sections below. This keeps the page shorter and makes access rules easier to control.
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="text-sm text-zinc-600">
              <div className="mb-1 font-medium">Company</div>
              <select
                value={companyId}
                onChange={(event) => {
                  const nextCompanyId = event.target.value;
                  const nextCompany = companies.find((item) => item.companyId === nextCompanyId);
                  setCompanyId(nextCompanyId);
                  setCompanyName(nextCompany?.name || "");
                }}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company._id || company.companyId} value={company.companyId}>{company.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={saveChanges}
              disabled={saving || !rules.length || !dirty}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : dirty ? "Save Access Control" : "All Changes Saved"}
            </button>
          </div>
        </div>

        {message ? (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${messageTone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message}
          </div>
        ) : dirty ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You have unsaved access changes for {companyName || "this company"}.
          </div>
        ) : null}

        <div className="mt-6">
          {loading ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading access rules...</div> : null}
          {!loading && !groupedRules.length ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">No configurable rules found.</div> : null}

          {groupedRules.length ? (
            <>
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3">
                  {groupedRules.map((group) => {
                    const isActive = selectedGroup?.moduleKey === group.moduleKey;
                    const totalRoles = new Set(group.items.flatMap((item) => item.allowedRoles || [])).size;
                    return (
                      <button
                        key={group.moduleKey}
                        type="button"
                        onClick={() => setSelectedModuleKey(group.moduleKey)}
                        className={`min-w-[240px] rounded-3xl border px-4 py-4 text-left transition ${isActive ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
                      >
                        <div className="text-sm font-semibold text-zinc-900">{humanizeModuleKey(group.moduleKey)}</div>
                        <div className="mt-1 text-xs text-zinc-500">{group.items.length} section{group.items.length === 1 ? "" : "s"}</div>
                        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                          <span>{totalRoles} active role{totalRoles === 1 ? "" : "s"}</span>
                          <span className={`rounded-full px-2 py-1 font-semibold ${isActive ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>{isActive ? "Open" : "View"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedGroup ? (
                <section className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50/60 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-zinc-900">{humanizeModuleKey(selectedGroup.moduleKey)}</div>
                      <div className="mt-1 text-sm text-zinc-500">Click any checkbox to allow or remove that section for the selected role.</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyRoleToSelectedModule("distributor", true)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">Allow all for Distributor</button>
                      <button type="button" onClick={() => applyRoleToSelectedModule("supplier", true)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">Allow all for Supplier</button>
                      <button type="button" onClick={() => applyRoleToSelectedModule("customer", false)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">Remove all for Customer</button>
                      <button type="button" onClick={resetSelectedModuleToDefaults} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">Reset selected module</button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {selectedGroup.items.map((rule) => (
                      <div key={rule.key} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-2 border-b border-zinc-100 pb-4">
                          <div className="text-base font-semibold text-zinc-900">{rule.title}</div>
                          <div className="text-sm text-zinc-500">{rule.description}</div>
                          <div className="text-xs text-zinc-400">Rule Key: {rule.key}</div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {MODULE_ACCESS_ROLE_OPTIONS.map((roleValue) => {
                            const checked = (rule.allowedRoles || []).includes(normalizeRole(roleValue));
                            return (
                              <label key={roleValue} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm ${checked ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-white"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleRole(rule.key, roleValue)} />
                                <span className="capitalize text-zinc-700">{roleValue}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
