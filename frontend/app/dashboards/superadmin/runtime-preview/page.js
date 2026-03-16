"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import DynamicDashboardShell from "../../../dashboards/components/DynamicDashboardShell";
import DynamicDashboardHome from "../../../dashboards/components/DynamicDashboardHome";
import { apiFetch } from "../../../lib/api";

function SuperAdminRuntimePreviewContent() {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [roles, setRoles] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    apiFetch("/platform-admin/companies")
      .then((data) => {
        if (ignore) return;
        const list = data?.companies || data?.data || [];
        setCompanies(list);

        const requestedCompanyId = searchParams.get("companyId");
        if (
          requestedCompanyId &&
          list.some((item) => String(item._id) === String(requestedCompanyId))
        ) {
          setCompanyId(String(requestedCompanyId));
        } else if (list[0]?._id) {
          setCompanyId(String(list[0]._id));
        }
      })
      .catch((err) => {
        if (!ignore) setError(err.message || "Failed to load companies");
      });

    return () => {
      ignore = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!companyId) return;

    let ignore = false;

    apiFetch(`/platform-admin/companies/${companyId}/roles`)
      .then((data) => {
        if (ignore) return;
        const list = data?.roles || [];
        setRoles(list);
        setDashboard(null);
        if (list[0]?.roleCode) setRoleCode(String(list[0].roleCode));
        else setRoleCode("");
      })
      .catch((err) => {
        if (!ignore) setError(err.message || "Failed to load company roles");
      });

    return () => {
      ignore = true;
    };
  }, [companyId]);

  async function loadPreview() {
    if (!companyId || !roleCode) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(
        `/platform-admin/companies/${companyId}/runtime-preview/${roleCode}`
      );
      setDashboard(data?.dashboard || null);
    } catch (err) {
      setError(err.message || "Failed to load runtime preview");
    } finally {
      setLoading(false);
    }
  }

  const canPreview = useMemo(
    () => Boolean(companyId && roleCode),
    [companyId, roleCode]
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-lg font-semibold">Runtime Preview</div>
          <div className="text-sm text-zinc-600 mt-1">
            Preview any configured company dashboard as a selected role without
            logging in as that user.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <select
              className="rounded-xl border px-3 py-2"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border px-3 py-2"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option
                  key={role._id || role.roleCode}
                  value={role.roleCode}
                >
                  {role.roleName || role.roleCode}
                </option>
              ))}
            </select>

            <button
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-50"
              disabled={!canPreview || loading}
              onClick={loadPreview}
            >
              {loading ? "Loading..." : "Preview Dashboard"}
            </button>
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          ) : null}
        </div>

        {!dashboard && !loading && roleCode && !error ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-zinc-600">
            Select a role and click Preview Dashboard.
          </div>
        ) : null}

        {dashboard ? (
          <DynamicDashboardShell dashboard={dashboard}>
            <DynamicDashboardHome dashboard={dashboard} />
          </DynamicDashboardShell>
        ) : null}
      </div>
    </div>
  );
}

export default function SuperAdminRuntimePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-lg font-semibold">Runtime Preview</div>
              <div className="text-sm text-zinc-600 mt-1">
                Loading preview tools...
              </div>
            </div>
          </div>
        </div>
      }
    >
      <SuperAdminRuntimePreviewContent />
    </Suspense>
  );
}