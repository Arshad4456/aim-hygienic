import apiClient from './client';

function normalizePayload(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.docs)) return value.docs;
  if (value && typeof value === 'object') return [value];
  return [];
}

export const INDUSTRY_ENDPOINTS = {
  retailPos: {
    overview: '/retail-pos/overview',
    primary: '/retail-pos/sales',
    secondary: '/retail-pos/sessions',
    print: (id) => `/retail-pos/print/receipt/${id}`,
  },
  manufacturing: {
    overview: '/manufacturing/overview',
    primary: '/manufacturing/production-orders',
    secondary: '/manufacturing/boms',
    print: (id) => `/manufacturing/print/production-order/${id}`,
  },
  service: {
    overview: '/service/overview',
    primary: '/service/tickets',
    secondary: '/service/orders',
    print: (id) => `/service/print/service-order/${id}`,
  },
  trading: {
    overview: '/trading/overview',
    primary: '/trading/shipments',
    secondary: '/trading/letters-of-credit',
    print: (id) => `/trading/print/shipment/${id}`,
  },
  systemAdmin: {
    overview: '/system-admin/overview',
    primary: '/system-admin/companies',
    secondary: '/system-admin/modules',
  },
  companyAdmin: {
    overview: '/dashboard/overview',
    primary: '/products',
    secondary: '/customers',
  },
};

export async function fetchIndustryOverview(moduleKey) {
  const endpoint = INDUSTRY_ENDPOINTS[moduleKey]?.overview;
  if (!endpoint) return {};
  const { data } = await apiClient.get(endpoint);
  return data || {};
}

export async function fetchIndustryList(moduleKey, listKey = 'primary') {
  const endpoint = INDUSTRY_ENDPOINTS[moduleKey]?.[listKey];
  if (!endpoint || typeof endpoint !== 'string') return [];
  const { data } = await apiClient.get(endpoint);
  return normalizePayload(data);
}

export async function fetchIndustryPrintData(moduleKey, id) {
  const printBuilder = INDUSTRY_ENDPOINTS[moduleKey]?.print;
  if (!printBuilder || !id) return null;
  const { data } = await apiClient.get(printBuilder(id));
  return data;
}

export async function fetchCompanyDashboardData() {
  try {
    const { data } = await apiClient.get('/dashboard/overview');
    return data || {};
  } catch (_error) {
    const { data } = await apiClient.get('/dashboard/summary');
    return data || {};
  }
}
