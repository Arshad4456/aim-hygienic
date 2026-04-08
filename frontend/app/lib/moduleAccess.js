import { apiFetch } from "./api";

export const MODULE_ACCESS_ROLE_OPTIONS = [
  "admin",
  "system admin",
  "company admin",
  "ceo",
  "managing director",
  "warehouse manager",
  "account officer",
  "hr assistant",
  "cashier",
  "kpo",
  "national sale manager",
  "regional sale manager",
  "zone sale manager",
  "territory sale manager",
  "distributor",
  "field sale manager",
  "order booker",
  "salesman",
  "delivery boy",
  "supplier",
  "vendor",
  "customer",
  "brand manager",
];

export function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

export async function fetchModuleAccess(companyId = "") {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
  return apiFetch(`/module-access${query}`);
}

export function isRuleAllowedForRole(rule, role) {
  const allowedRoles = Array.isArray(rule?.allowedRoles) ? rule.allowedRoles.map(normalizeRole) : [];
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return true;
  if (!allowedRoles.length) return !rule?.locked;
  return allowedRoles.includes(normalizedRole);
}

export function getRuleByKey(rules = [], key = "") {
  return (rules || []).find((rule) => String(rule?.key || "") === String(key || "")) || null;
}

const HREF_RULES = [
  [/\/dashboards\/admin$/, "dashboard.overview"],
  [/\/operations$/, "dashboard.operations"],
  [/\/sales-kpi$/, "dashboard.sales-kpi"],

  [/\/admin\/hr$/, "hr.overview"],
  [/\/users\/add$/, "hr.users.add"],
  [/\/users$/, "hr.users.list"],
  [/\/admin\/module-access$/, "hr.module-access"],
  [/\/distributor\/hr$/, "hr.overview"],
  [/\/distributor\/users\/add$/, "hr.users.add"],
  [/\/distributor\/users$/, "hr.users.list"],

  [/\/products\/add$/, "products.add"],
  [/\/products\/barcodes$/, "products.barcodes"],
  [/\/products\/price-change$/, "products.price-change"],
  [/\/products$/, "products.list"],

  [/\/warehouse-inventory$/, "warehouse-inventory.overview"],
  [/\/inventory\/warehouses$/, "warehouse-inventory.warehouse-master"],
  [/\/inventory\/ledger$/, "warehouse-inventory.ledger"],
  [/\/inventory\/transfers$/, "warehouse-inventory.transfers"],
  [/\/inventory\/summary$/, "warehouse-inventory.summary"],
  [/\/inventory\/low-stock$/, "warehouse-inventory.low-stock"],
  [/\/inventory\/near-expiry$/, "warehouse-inventory.near-expiry"],

  [/\/warehouses\/add$/, "territory-assets.warehouses.add"],
  [/\/warehouses$/, "territory-assets.warehouses.list"],
  [/\/regions\/add$/, "territory-assets.regions.add"],
  [/\/regions$/, "territory-assets.regions.list"],
  [/\/zones\/add$/, "territory-assets.zones.add"],
  [/\/zones$/, "territory-assets.zones.list"],
  [/\/areas\/add$/, "territory-assets.territories.add"],
  [/\/areas$/, "territory-assets.territories.list"],
  [/\/fields\/add$/, "territory-assets.fields.add"],
  [/\/fields$/, "territory-assets.fields.list"],

  [/\/admin\/order-management$/, "order-management.overview"],
  [/\/warehouseManager\/order-management$/, "order-management.overview"],
  [/\/order-management\/sales-orders$/, "order-management.overview"],
  [/\/order-management\/approvals$/, "order-management.overview"],
  [/\/order-management\/dispatch$/, "order-management.overview"],
  [/\/brandManager\/primary-order-request$/, "order-management.primary"],
  [/\/distributor\/primary-order-request$/, "order-management.primary"],
  [/\/supplier\/primary-orders$/, "order-management.primary"],
  [/\/brandManager\/orders$/, "order-management.primary"],
  [/\/distributor\/orders$/, "order-management.secondary"],
  [/\/orderBooker\/orders$/, "order-management.secondary"],
  [/\/customer\/orders$/, "order-management.secondary"],
  [/\/salesman\/orders$/, "order-management.secondary"],
  [/\/deliveryBoy\/orders$/, "order-management.secondary"],
  [/\/brandManager\/return-stock$/, "order-management.return-stock"],
  [/\/distributor\/return-stock$/, "order-management.return-stock"],
  [/\/order-management\/returns$/, "order-management.return-stock"],

  [/\/vehicle-management$/, "vehicle-management.overview"],
  [/\/assets\/vehicles\/add$/, "vehicle-management.add"],
  [/\/assets\/vehicles$/, "vehicle-management.list"],
  [/\/vehicle-management\/add$/, "vehicle-management.add"],
  [/\/vehicle-management\/vehicles$/, "vehicle-management.list"],
  [/\/vehicle-management\/fuel-management$/, "vehicle-management.fuel"],
  [/\/vehicle-management\/maintenance$/, "vehicle-management.maintenance"],

  [/\/account\/manage$/, "account-management.accounts"],
  [/\/account\/loan-detail$/, "account-management.loans"],
  [/\/finance\/payments$/, "account-management.payments"],
  [/\/expense\/add$/, "expense.overview"],
  [/\/warehouseManager\/payments$/, "account-management.payments"],
  [/\/warehouseManager\/payments\/primary$/, "account-management.payments"],
  [/\/warehouseManager\/payments\/secondary$/, "account-management.payments"],
  [/\/distributor\/payments$/, "account-management.payments"],
  [/\/distributor\/payments\/primary$/, "account-management.payments"],
  [/\/distributor\/payments\/secondary$/, "account-management.payments"],

  [/\/finance$/, "finance.overview"],
  [/\/finance\/invoices$/, "finance.invoices"],
  [/\/finance\/receipts$/, "finance.receipts"],
  [/\/distributor\/receipts$/, "finance.receipts"],
  [/\/orderBooker\/receipts$/, "finance.receipts"],
  [/\/customer\/receipts$/, "finance.receipts"],
  [/\/finance\/aging$/, "finance.aging"],

  [/\/expense$/, "expense.overview"],
  [/\/expense\/personal$/, "expense.personal"],
  [/\/expense\/daily$/, "expense.daily"],
  [/\/expense\/distributor$/, "expense.distributor"],
  [/\/distributor\/expense$/, "expense.distributor"],

  [/\/procurement$/, "procurement.overview"],
  [/\/procurement\/suppliers$/, "procurement.suppliers"],
  [/\/procurement\/purchase-orders$/, "procurement.purchase-orders"],
  [/\/procurement\/grn$/, "procurement.grn"],
  [/\/procurement\/payments$/, "procurement.payments"],

  [/\/logistics$/, "logistics.overview"],
  [/\/logistics\/routes$/, "logistics.routes"],
  [/\/logistics\/dispatch$/, "logistics.dispatch"],

  [/\/quality$/, "quality.overview"],
  [/\/quality\/raw-material$/, "quality.raw-material"],
  [/\/quality\/production$/, "quality.production"],
  [/\/quality\/finished-goods$/, "quality.finished-goods"],
  [/\/quality\/final-release$/, "quality.final-release"],

  [/\/messages$/, "messages"],
  [/\/live-tracking$/, "live-tracking"],
  [/\/reports\/sales$/, "reports"],
  [/\/reports\/inventory$/, "reports"],
  [/\/reports\/finance$/, "reports"],
  [/\/reports\/hr$/, "reports"],
  [/\/reports\/logistics$/, "reports"],
  [/\/reports\/compliance$/, "reports"],
  [/\/reports\/.+$/, "reports"],
  [/\/reports$/, "reports"],
  [/\/settings(?:\/change-password)?$/, "settings"],
];

export function mapHrefToRuleKey(href = "") {
  const value = String(href || "").trim();
  for (const [pattern, key] of HREF_RULES) {
    if (pattern.test(value)) return key;
  }
  return "";
}
