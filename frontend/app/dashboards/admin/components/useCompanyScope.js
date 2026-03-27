"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function useCompanyScope() {
  const [companies, setCompanies] = useState([]);
  const [companyDocId, setCompanyDocId] = useState("");
  const [canSelectCompany, setCanSelectCompany] = useState(true);
  const [loadingCompanyScope, setLoadingCompanyScope] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadScope() {
      try {
        const me = await apiFetch("/users/me");
        const role = String(me?.user?.role || "").trim().toLowerCase();
        const scopedCompanyId = String(me?.user?.companyId || "").trim();
        const scopedCompanyName = String(me?.user?.companyName || "").trim();
        const isSystemAdmin = role === "admin" || role === "system admin";
        if (!mounted) return;
        setCanSelectCompany(isSystemAdmin);

        if (!isSystemAdmin) {
          const scoped = scopedCompanyId
            ? [{ _id: scopedCompanyId, companyId: scopedCompanyId, name: scopedCompanyName || scopedCompanyId }]
            : [];
          setCompanies(scoped);
          setCompanyDocId(scopedCompanyId || "");
          return;
        }

        const companiesRes = await apiFetch("/companies");
        if (!mounted) return;
        setCompanies(companiesRes.companies || []);
      } catch (_e) {
        if (!mounted) return;
        setCompanies([]);
        setCompanyDocId("");
      } finally {
        if (mounted) setLoadingCompanyScope(false);
      }
    }
    loadScope();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((c) => c._id === companyDocId) || null,
    [companies, companyDocId],
  );

  return {
    companies,
    companyDocId,
    setCompanyDocId,
    selectedCompany,
    canSelectCompany,
    loadingCompanyScope,
  };
}
