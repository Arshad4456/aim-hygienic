export const PORTAL_TYPES = {
  SYSTEM_ADMIN: "system_admin", COMPANY_ADMIN: "company_admin", DISTRIBUTOR: "distributor", CUSTOMER: "customer", SALESMAN: "salesman", ORDER_BOOKER: "order_booker", WAREHOUSE_MANAGER: "warehouse_manager", DELIVERY_BOY: "delivery_boy", SUPPLIER: "supplier", BRAND_MANAGER: "brand_manager", FINANCE_USER: "finance_user", AUDITOR: "auditor",
};
export function normalizePortalType(value = "") { return String(value || "company_user").trim().toLowerCase().replace(/\s+/g, "_"); }
