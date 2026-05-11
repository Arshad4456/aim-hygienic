export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },
  dashboard: {
    summary: '/dashboard/summary',
    overview: '/dashboard/overview',
  },
  uploads: {
    presign: '/uploads/presign',
    complete: '/uploads/complete',
    documentUrl: '/uploads/document-url',
    document: '/uploads/document',
  },
  retailPos: {
    overview: '/retail-pos/overview',
    sessions: '/retail-pos/sessions',
    openSession: '/retail-pos/sessions/open',
    sales: '/retail-pos/sales',
    products: '/retail-pos/products',
    customers: '/retail-pos/customers',
    print: (type, id) => `/retail-pos/print/${type}/${id}`,
  },
  manufacturing: {
    overview: '/manufacturing/overview',
    boms: '/manufacturing/boms',
    productionOrders: '/manufacturing/production-orders',
    qualityChecks: '/manufacturing/quality-checks',
    maintenance: '/manufacturing/maintenance',
    print: (type, id) => `/manufacturing/print/${type}/${id}`,
  },
  service: {
    overview: '/service/overview',
    assets: '/service/assets',
    contracts: '/service/contracts',
    tickets: '/service/tickets',
    orders: '/service/orders',
    technicians: '/service/technicians',
    print: (type, id) => `/service/print/${type}/${id}`,
  },
  trading: {
    overview: '/trading/overview',
    shipments: '/trading/shipments',
    lettersOfCredit: '/trading/letters-of-credit',
    landedCosts: '/trading/landed-costs',
    print: (type, id) => `/trading/print/${type}/${id}`,
  },
  systemAdmin: {
    companies: '/system-admin/companies',
    modules: '/system-admin/modules',
    subscriptions: '/subscriptions/plans',
  },
};

export default endpoints;
