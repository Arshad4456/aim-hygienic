import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, apiPut, withQuery } from "@/src/services/apiClient";

export { apiClient, apiDelete, apiFetch, apiGet, apiPatch, apiPost, apiPut, clearStoredToken, getApiBaseCandidates, getStoredToken, normalizeApiBase, setStoredToken, uploadFile, withQuery } from "@/src/services/apiClient";

export const v2Api = {
  orders: {
    list: (params = {}) => apiGet(withQuery("/orders", params)),
    create: (payload, params = {}) => apiPost(withQuery("/orders", params), payload),
    approve: (id, params = {}) => apiPost(withQuery(`/orders/${id}/approve`, params), {}),
  },
  inventory: {
    ledger: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
    createCompanyDispatch: (payload) => apiPost("/inventory/company-dispatches", payload),
    postCompanyDispatch: (id) => apiPost(`/inventory/company-dispatches/${id}/post`, {}),
    createDistributorReceipt: (payload) => apiPost("/inventory/distributor-stock-receipts", payload),
    postDistributorReceipt: (id) => apiPost(`/inventory/distributor-stock-receipts/${id}/post`, {}),
  },
  receipts: {
    list: (params = {}) => apiGet(withQuery("/receipts", params)),
    listInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", params)),
    create: (payload, params = {}) => apiPost(withQuery("/receipts", params), payload),
    post: (id, params = {}) => apiPost(withQuery(`/receipts/${id}/post`, params), {}),
  },
  payments: {
    listSupplierInvoices: (params = {}) => apiGet(withQuery("/payments/supplier-invoices", params)),
    createSupplierInvoice: (payload) => apiPost("/payments/supplier-invoices", payload),
    postSupplierInvoice: (id) => apiPost(`/payments/supplier-invoices/${id}/post`, {}),
    listSupplierPayments: (params = {}) => apiGet(withQuery("/payments/supplier-payments", params)),
    createSupplierPayment: (payload) => apiPost("/payments/supplier-payments", payload),
    postSupplierPayment: (id) => apiPost(`/payments/supplier-payments/${id}/post`, {}),
  },

  dashboard: {
    overview: (params = {}) => apiGet(withQuery("/dashboard/overview", params)),
    operations: (params = {}) => apiGet(withQuery("/dashboard/operations", params)),
    salesManager: (params = {}) => apiGet(withQuery("/dashboard/sales-manager", params)),
    salesKpi: (params = {}) => apiGet(withQuery("/sales-kpi/summary", params)),
  },

  reports: {
    overview: (params = {}) => apiGet(withQuery("/reports/overview", params)),
    inventory: (params = {}) => apiGet(withQuery("/reports/inventory", params)),
    finance: (params = {}) => apiGet(withQuery("/reports/finance", params)),
    procurement: (params = {}) => apiGet(withQuery("/reports/procurement", params)),
    logistics: (params = {}) => apiGet(withQuery("/reports/logistics", params)),
  },

  finance: {
    overview: (params = {}) => apiGet(withQuery("/reports/finance", params)),
    listDistributors: (params = {}) => apiGet(withQuery("/users", { role: "Distributor", ...params })),
    listCompanyInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "company_distributor", ...params })),
    createCompanyInvoice: (payload, params = {}) => apiPost(withQuery("/receipts/invoices", { family: "company_distributor", ...params }), payload),
    postCompanyInvoice: (id, params = {}) => apiPost(withQuery(`/receipts/invoices/${id}/post`, { family: "company_distributor", ...params }), {}),
    listCompanyReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "company_distributor", ...params })),
    createCompanyReceipt: (payload, params = {}) => apiPost(withQuery("/receipts", { family: "company_distributor", ...params }), payload),
    postCompanyReceipt: (id, params = {}) => apiPost(withQuery(`/receipts/${id}/post`, { family: "company_distributor", ...params }), {}),
    listCompanyOpenOrders: (params = {}) => apiGet(withQuery("/receipts/orders/open", { family: "company_distributor", ...params })),
    listSupplierInvoices: (params = {}) => apiGet(withQuery("/payments/supplier-invoices", params)),
    createSupplierInvoice: (payload) => apiPost("/payments/supplier-invoices", payload),
    postSupplierInvoice: (id) => apiPost(`/payments/supplier-invoices/${id}/post`, {}),
    listSupplierPayments: (params = {}) => apiGet(withQuery("/payments/supplier-payments", params)),
    createSupplierPayment: (payload) => apiPost("/payments/supplier-payments", payload),
    postSupplierPayment: (id) => apiPost(`/payments/supplier-payments/${id}/post`, {}),
  },

  warehouseManager: {
    overview: (params = {}) => apiGet(withQuery("/dashboard/operations", params)),
    inventoryReport: (params = {}) => apiGet(withQuery("/reports/inventory", params)),
    ledger: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
    listCompanySupplyOrders: (params = {}) => apiGet(withQuery("/orders", { family: "company_supply", ...params })),
    listCompanyDispatches: (params = {}) => apiGet(withQuery("/inventory/company-dispatches", params)),
    createCompanyDispatch: (payload) => apiPost("/inventory/company-dispatches", payload),
    postCompanyDispatch: (id) => apiPost(`/inventory/company-dispatches/${id}/post`, {}),
    lowStock: (params = {}) => apiGet(withQuery("/inventory/low-stock", params)),
    nearExpiry: (params = {}) => apiGet(withQuery("/inventory/near-expiry-products", params)),
    listWarehouses: (params = {}) => apiGet(withQuery("/warehouses", params)),
  },
  logistics: {
    overview: (params = {}) => apiGet(withQuery("/reports/logistics", params)),
    operations: (params = {}) => apiGet(withQuery("/dashboard/operations", params)),
    listCompanyDispatches: (params = {}) => apiGet(withQuery("/inventory/company-dispatches", params)),
    createCompanyDispatch: (payload) => apiPost("/inventory/company-dispatches", payload),
    postCompanyDispatch: (id) => apiPost(`/inventory/company-dispatches/${id}/post`, {}),
    listCompanySupplyOrders: (params = {}) => apiGet(withQuery("/orders", { family: "company_supply", ...params })),
    listVehicles: (params = {}) => apiGet(withQuery("/vehicles", params)),
    listUsers: (params = {}) => apiGet(withQuery("/users", params)),
    listWarehouses: (params = {}) => apiGet(withQuery("/warehouses", params)),
    listRegions: (params = {}) => apiGet(withQuery("/regions", params)),
    listZones: (params = {}) => apiGet(withQuery("/zones", params)),
    listAreas: (params = {}) => apiGet(withQuery("/areas", params)),
    listLiveUsers: () => apiGet("/location/live-users"),
  },

  procurement: {
    overview: (params = {}) => apiGet(withQuery("/procurement/overview", params)),
    suppliers: (params = {}) => apiGet(withQuery("/procurement/suppliers", params)),
    supplierById: async (id, params = {}) => {
      if (!id) return { ok: true, user: null };
      try {
        return await apiGet(withQuery(`/users/${id}`, params));
      } catch (_error) {
        const list = await apiGet(withQuery("/users", { role: "Supplier", ...params }));
        const matched = (list?.users || []).find((item) => String(item?._id || item?.id || "") === String(id));
        return { ok: true, user: matched || null };
      }
    },
    purchaseOrders: (params = {}) => apiGet(withQuery("/procurement/purchase-orders", params)),
    createPurchaseOrder: (payload) => apiPost("/procurement/purchase-orders", payload),
    approvePurchaseOrder: (id) => apiPost(`/procurement/purchase-orders/${id}/approve`, {}),
    receivePurchaseOrder: (id, payload = {}) => apiPost(`/procurement/purchase-orders/${id}/receive`, payload),
    goodsReceipts: (params = {}) => apiGet(withQuery("/procurement/goods-receipts", params)),
    supplierInvoices: (params = {}) => apiGet(withQuery("/procurement/supplier-invoices", params)),
    supplierPayments: (params = {}) => apiGet(withQuery("/procurement/supplier-payments", params)),
    supplierPrimaryOrders: () => apiGet("/inventory/transactions/supplier/primary"),
  },


  distributor: {
    overview: (params = {}) => apiGet(withQuery("/dashboard/overview", params)),
    salesKpi: (params = {}) => apiGet(withQuery("/sales-kpi/summary", params)),
    inventoryReport: (params = {}) => apiGet(withQuery("/reports/inventory", params)),
    financeReport: (params = {}) => apiGet(withQuery("/reports/finance", params)),
    inventoryLedger: (params = {}) => apiGet(withQuery("/inventory/ledger", { ownerType: "distributor", ...params })),
    lowStock: (params = {}) => apiGet(withQuery("/inventory/low-stock", params)),
    nearExpiry: (params = {}) => apiGet(withQuery("/inventory/near-expiry-products", params)),
    listReturns: (params = {}) => apiGet(withQuery("/returns", params)),
    listSecondaryOrders: (params = {}) => apiGet(withQuery("/orders", { family: "secondary", ...params })),
    listCustomerReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "distributor_customer", ...params })),
    listCustomerInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "distributor_customer", ...params })),
    listCompanyInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "company_distributor", ...params })),
    listExpenses: (params = {}) => apiGet(withQuery("/expenses", params)),
  },

  salesman: {
    me: () => apiGet("/users/me"),
    listAssignedOrders: (params = {}) => apiGet(withQuery("/orders", { family: "secondary", status: "all", ...params })),
    listAssignedDeliveries: (params = {}) => apiGet(withQuery("/orders/salesman-deliveries", { limit: 500, ...params })),
    listCustomers: (params = {}) => apiGet(withQuery("/users", { role: "Customer", ...params })),
    listCustomerInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "distributor_customer", paymentStatus: "all", ...params })),
    listCustomerReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "distributor_customer", status: "all", ...params })),
    listLiveUsers: () => apiGet("/location/live-users"),
  },

  orderBooker: {
    me: () => apiGet("/users/me"),
    listOrders: (params = {}) => apiGet(withQuery("/orders", { family: "secondary", status: "all", ...params })),
    listCustomers: (params = {}) => apiGet(withQuery("/users", { role: "Customer", ...params })),
    listCustomerInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "distributor_customer", paymentStatus: "all", ...params })),
    listCustomerReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "distributor_customer", status: "all", ...params })),
    listLiveUsers: () => apiGet("/location/live-users"),
  },

  driverDelivery: {
    me: () => apiGet("/users/me"),
    listMyOrders: () => apiGet("/orders/my"),
    listCustomerInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "distributor_customer", paymentStatus: "all", ...params })),
    listCustomerReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "distributor_customer", status: "all", ...params })),
    listLiveUsers: () => apiGet("/location/live-users"),
  },


  customer: {
    listOrders: (params = {}) => apiGet(withQuery("/orders", { family: "secondary", ...params })),
    listInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "distributor_customer", ...params })),
    listReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "distributor_customer", ...params })),
    listReturns: (params = {}) => apiGet(withQuery("/returns", params)),
  },

  systemAdmin: {
    listCompanies: () => apiGet("/companies"),
    getCompany: (id) => apiGet(`/companies/${id}`),
    createCompany: (payload) => apiPost("/companies", payload),
    updateCompany: (id, payload) => apiPut(`/companies/${id}`, payload),
    deleteCompany: (id) => apiDelete(`/companies/${id}`),
    getModuleAccess: (companyId = "") => apiGet(withQuery("/module-access", { companyId })),
    saveModuleAccess: (payload) => apiPut("/module-access", payload),
  },
};
