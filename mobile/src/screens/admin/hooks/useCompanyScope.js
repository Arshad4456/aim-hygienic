import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';

const ADMIN_ROLES = new Set(['admin', 'system admin']);

export default function useCompanyScope() {
  const [companies, setCompanies] = useState([]);
  const [companyDocId, setCompanyDocId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const companyRes = await apiClient.get('/companies');
        if (!mounted) return;
        const list = companyRes.data?.companies || [];
        setCompanies(list);
      } catch (_companyErr) {
        try {
          const meRes = await apiClient.get('/users/me');
          if (!mounted) return;
          const user = meRes.data?.user || null;
          setCurrentUser(user);
          const scopedCompanyId = String(user?.companyId || '').trim();
          const scopedCompanyName = String(user?.companyName || '').trim();
          if (scopedCompanyId) {
            setCompanies([{ _id: scopedCompanyId, companyId: scopedCompanyId, name: scopedCompanyName || scopedCompanyId }]);
            setCompanyDocId(scopedCompanyId);
          }
        } catch (_meErr) {
          if (!mounted) return;
          setCompanies([]);
        }
      } finally {
        if (mounted) setLoadingCompanies(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const normalizedRole = String(currentUser?.role || '').trim().toLowerCase();
  const canSelectCompany = ADMIN_ROLES.has(normalizedRole) || !normalizedRole;

  useEffect(() => {
    if (canSelectCompany) return;
    if (!companyDocId && companies.length === 1) {
      setCompanyDocId(companies[0]._id || companies[0].companyId || '');
    }
  }, [canSelectCompany, companies, companyDocId]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => (c._id || c.companyId) === companyDocId) || null;
  }, [companies, companyDocId]);

  return {
    companies,
    companyDocId,
    setCompanyDocId,
    selectedCompany,
    canSelectCompany,
    loadingCompanies,
  };
}
