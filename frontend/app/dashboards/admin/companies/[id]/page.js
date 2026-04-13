"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import PageHeader from "../../../../components/foundation/PageHeader";
import SectionCard from "../../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../../components/foundation/ModuleCardStrip";
import EmptyState from "../../../../components/foundation/EmptyState";
import StatusBadge from "../../../../components/foundation/StatusBadge";
import { v2Api } from "../../../../lib/api";
import { MODULE_ACCESS_ROLE_OPTIONS, normalizeRole } from "../../../../lib/moduleAccess";

function humanizeModuleKey(value = "") {
  return String(value || "other")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildHealthTone(company = {}) {
  const score = [company.email, company.phone1, company.mainOfficeAddress].filter(Boolean).length;
  if (score === 3) return { value: "Complete", tone: "approved" };
  if (score === 2) return { value: "Needs Review", tone: "pending" };
  return { value: "Setup Required", tone: "unpaid" };
}

function cloneRules(rules = []) {
  return (rules || []).map((rule) => ({ ...rule, allowedRoles: [...(rule.allowedRoles || [])] }));
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [rules, setRules] = useState([]);
  const [originalRules, setOriginalRules] = useState([]);
  const [selectedModuleKey, setSelectedModuleKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("neutral");

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const companyRes = await v2Api.systemAdmin.getCompany(params.id);
      const nextCompany = companyRes?.company || null;
      setCompany(nextCompany);
      if (nextCompany?.companyId) {
        const accessRes = await v2Api.systemAdmin.getModuleAccess(nextCompany.companyId);
        const loadedRules = cloneRules(accessRes?.rules || []);
        setRules(loadedRules);
        setOriginalRules(cloneRules(accessRes?.rules || []));
        if (!selectedModuleKey) {
          const firstModuleKey = loadedRules[0]?.moduleKey || "";
          setSelectedModuleKey(firstModuleKey);
        }
      }
    } catch (error) {
      setTone("error");
      setMessage(error.message || "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const groupedRules = useMemo(() => {
    const groups = new Map();
    (rules || []).forEach((rule) => {
      const key = String(rule?.moduleKey || "other");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rule);
    });
    return Array.from(groups.entries()).map(([moduleKey, items]) => ({
      moduleKey,
      items: items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""))),
    }));
  }, [rules]);

  useEffect(() => {
    if (!selectedModuleKey && groupedRules.length) {
      setSelectedModuleKey(groupedRules[0].moduleKey);
    }
  }, [groupedRules, selectedModuleKey]);

  const selectedGroup = useMemo(
    () => groupedRules.find((group) => group.moduleKey === selectedModuleKey) || groupedRules[0] || null,
    [groupedRules, selectedModuleKey],
  );

  const dirty = useMemo(() => JSON.stringify(rules) !== JSON.stringify(originalRules), [rules, originalRules]);

  function toggleRole(ruleKey, roleValue) {
    const normalized = normalizeRole(roleValue);
    setRules((current) =>
      current.map((rule) => {
        if (rule.key !== ruleKey) return rule;
        const allowedRoles = Array.isArray(rule.allowedRoles) ? [...rule.allowedRoles] : [];
        const exists = allowedRoles.includes(normalized);
        return {
          ...rule,
          locked: true,
          allowedRoles: exists ? allowedRoles.filter((item) => item !== normalized) : [...allowedRoles, normalized],
        };
      }),
    );
    setMessage("");
  }

  function setModuleEnabled(moduleKey, enabled) {
    setRules((current) =>
      current.map((rule) => {
        if (rule.moduleKey !== moduleKey) return rule;
        const original = originalRules.find((item) => item.key === rule.key);
        return {
          ...rule,
          locked: true,
          allowedRoles: enabled ? [...(original?.allowedRoles || rule.allowedRoles || [])] : [],
        };
      }),
    );
    setMessage("");
  }

  function resetModule(moduleKey) {
    setRules((current) =>
      current.map((rule) => {
        if (rule.moduleKey !== moduleKey) return rule;
        const original = originalRules.find((item) => item.key === rule.key);
        return original ? { ...original, allowedRoles: [...(original.allowedRoles || [])] } : rule;
      }),
    );
    setMessage("");
  }

  async function saveChanges() {
    if (!company?.companyId) return;
    setSaving(true);
    setMessage("");
    try {
      const data = await v2Api.systemAdmin.saveModuleAccess({
        companyId: company.companyId,
        companyName: company.name,
        rules,
      });
      const savedRules = cloneRules(data?.config?.rules || rules);
      setRules(savedRules);
      setOriginalRules(savedRules);
      setTone("success");
      setMessage("Company access settings saved successfully.");
    } catch (error) {
      setTone("error");
      setMessage(error.message || "Failed to save company access settings");
    } finally {
      setSaving(false);
    }
  }

  const moduleCards = useMemo(
    () =>
      groupedRules.map((group) => {
        const enabledCount = group.items.filter((item) => (item.allowedRoles || []).length > 0).length;
        return {
          key: group.moduleKey,
          title: humanizeModuleKey(group.moduleKey),
          description: enabledCount ? `${enabledCount}/${group.items.length} sections active` : "All sections locked",
        };
      }),
    [groupedRules],
  );

  const companyHealth = buildHealthTone(company || {});

  return (
    <AdminShell title="Company Details" user={null}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="System Admin"
          title={company ? `${company.name} control center` : "Company details"}
          description="Edit company identity, inspect readiness, and control module/section access for this tenant from one page."
          actions={
            <>
              <button type="button" onClick={() => load()} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Refresh
              </button>
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={saveChanges}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : dirty ? "Save company controls" : "All changes saved"}
              </button>
            </>
          }
        />

        {message ? <div className={`rounded-3xl border px-4 py-3 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div> : null}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 shadow-sm">Loading company details...</div>
        ) : !company ? (
          <EmptyState title="Company not found" description="The selected company could not be loaded." action={<button type="button" onClick={() => router.push('/dashboards/admin/companies')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Back to company list</button>} />
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard title="Company profile" description="Identity and readiness fields used across the platform.">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                    <div>
                      <div className="text-xl font-semibold text-zinc-900">{company.name}</div>
                      <div className="mt-1 text-sm text-zinc-500">Company ID: {company.companyId || '-'}</div>
                      <div className="mt-1 text-sm text-zinc-500">Tenant slug: {company.slug || '-'}</div>
                    </div>
                    <StatusBadge value={companyHealth.value} tone={companyHealth.tone} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Info label="Email" value={company.email} />
                    <Info label="Primary phone" value={company.phone1} />
                    <Info label="Secondary phone" value={company.phone2} />
                    <Info label="Created" value={company.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(company.createdAt)) : '-'} />
                    <div className="md:col-span-2"><Info label="Main office" value={company.mainOfficeAddress} /></div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/dashboards/admin/companies" className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Back to company list</Link>
                    <Link href="/dashboards/admin/module-access" className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Open full module access page</Link>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Company feature and module enable / disable" description="Each module card opens its sections below. Toggle sections by role or lock the whole module for this company.">
                {moduleCards.length ? (
                  <>
                    <ModuleCardStrip items={moduleCards} activeKey={selectedGroup?.moduleKey || ""} onSelect={(item) => setSelectedModuleKey(item.key)} />
                    {selectedGroup ? (
                      <div className="mt-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div>
                            <div className="text-base font-semibold text-zinc-900">{humanizeModuleKey(selectedGroup.moduleKey)}</div>
                            <div className="mt-1 text-sm text-zinc-500">Use the buttons below to disable or restore the full module, then fine-tune section access per role.</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setModuleEnabled(selectedGroup.moduleKey, false)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">Disable module</button>
                            <button type="button" onClick={() => setModuleEnabled(selectedGroup.moduleKey, true)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Enable module</button>
                            <button type="button" onClick={() => resetModule(selectedGroup.moduleKey)} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">Reset module</button>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          {selectedGroup.items.map((rule) => (
                            <div key={rule.key} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                                <div>
                                  <div className="text-base font-semibold text-zinc-900">{rule.title}</div>
                                  <div className="mt-1 text-sm text-zinc-500">{rule.description}</div>
                                  <div className="mt-1 text-xs text-zinc-400">Rule key: {rule.key}</div>
                                </div>
                                <StatusBadge value={(rule.allowedRoles || []).length ? 'Enabled' : 'Locked'} tone={(rule.allowedRoles || []).length ? 'approved' : 'draft'} />
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {MODULE_ACCESS_ROLE_OPTIONS.map((roleValue) => {
                                  const checked = (rule.allowedRoles || []).includes(normalizeRole(roleValue));
                                  return (
                                    <label key={roleValue} className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm ${checked ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-200 bg-white'}`}>
                                      <input type="checkbox" checked={checked} onChange={() => toggleRole(rule.key, roleValue)} />
                                      <span className="capitalize text-zinc-700">{roleValue}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <EmptyState title="No module rules found" description="This company does not have configurable module rules yet." />
                )}
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-zinc-900">{value || 'Not added'}</div>
    </div>
  );
}
