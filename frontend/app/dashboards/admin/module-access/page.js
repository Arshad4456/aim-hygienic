"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import { fetchModuleAccess, MODULE_ACCESS_ROLE_OPTIONS, normalizeRole } from "../../../lib/moduleAccess";
import { getAuthItem } from "../../../lib/clientAuth";

export default function ModuleAccessPage() {
  const [rules, setRules] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const user = useMemo(() => {
    if (typeof window === "undefined") return null;
    return JSON.parse(getAuthItem("aim_user") || "null");
  }, []);
  const isSystemAdmin = ["admin", "system admin"].includes(normalizeRole(user?.role));

  const groupedRules = useMemo(() => {
    const groups = new Map();
    (rules || []).forEach((rule) => {
      const groupKey = String(rule?.moduleKey || "other");
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(rule);
    });
    return Array.from(groups.entries()).map(([moduleKey, items]) => ({
      moduleKey,
      items: items.sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || ""))),
    }));
  }, [rules]);


  useEffect(() => {
    let active = true;
    async function loadCompanies() {
      if (!isSystemAdmin) return;
      const data = await apiFetch("/companies");
      if (!active) return;
      setCompanies(data.companies || []);
      const defaultCompanyId = user?.companyId || data.companies?.[0]?.companyId || "";
      const defaultCompany = (data.companies || []).find((item) => item.companyId === defaultCompanyId);
      setCompanyId(defaultCompanyId);
      setCompanyName(defaultCompany?.name || user?.companyName || "");
    }
    loadCompanies().catch(() => {});
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
        setRules(Array.isArray(data?.rules) ? data.rules : []);
        setCompanyName(data?.companyName || companyName || user?.companyName || "");
      })
      .catch((error) => setMessage(error.message || "Failed to load access configuration"))
      .finally(() => setLoading(false));
  }, [companyId, companyName, isSystemAdmin, user?.companyId, user?.companyName]);

  function toggleRole(ruleKey, roleValue) {
    setRules((current) => current.map((rule) => {
      if (rule.key !== ruleKey) return rule;
      const allowedRoles = Array.isArray(rule.allowedRoles) ? [...rule.allowedRoles] : [];
      const normalized = normalizeRole(roleValue);
      const exists = allowedRoles.includes(normalized);
      return {
        ...rule,
        locked: true,
        allowedRoles: exists ? allowedRoles.filter((item) => item !== normalized) : [...allowedRoles, normalized],
      };
    }));
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
      setRules(data?.config?.rules || rules);
      setMessage("Access control saved successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to save access control");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Module Access Control" user={null}>
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Module and section lock control</div>
            <div className="mt-1 text-sm text-zinc-500">Control which roles can open or hide each module and section across dashboards. These rules now cover order management, warehouse, products, HR, finance, expense, reports, messages, live tracking, vehicles, procurement, quality, and more.</div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {isSystemAdmin ? (
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
            ) : null}
            <button
              type="button"
              onClick={saveChanges}
              disabled={saving || !rules.length}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save access control"}
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{message}</div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {loading ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading access rules...</div> : null}
          {!loading && !rules.length ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">No configurable rules found.</div> : null}
          {groupedRules.map((group) => (
            <section key={group.moduleKey} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 border-b border-zinc-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{String(group.moduleKey || "other").replace(/[-_]/g, " ")}</div>
                  <div className="mt-1 text-sm text-zinc-500">Manage all sections inside this module group.</div>
                </div>
                <div className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">{group.items.length} section{group.items.length === 1 ? "" : "s"}</div>
              </div>

              <div className="mt-4 grid gap-4">
                {group.items.map((rule) => (
                  <div key={rule.key} className="rounded-3xl border border-zinc-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-zinc-900">{rule.title}</div>
                        <div className="mt-1 text-sm text-zinc-500">{rule.description}</div>
                        <div className="mt-2 text-xs text-zinc-400">Rule Key: {rule.key}</div>
                      </div>
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
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
