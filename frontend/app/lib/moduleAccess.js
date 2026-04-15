import { apiFetch } from "./api";

export const MODULE_ACCESS_ROLE_OPTIONS = [
  "admin",
  "system admin",
  "company admin",
  "purchase manager",
  "warehouse manager",
  "finance / accounts",
  "dispatch / logistics",
  "supplier",
  "distributor",
  "distributor accountant",
  "distributor store manager",
  "order booker",
  "salesman",
  "driver / delivery",
  "customer",
  // legacy compatibility
  "ceo",
  "managing director",
  "account officer",
  "hr assistant",
  "cashier",
  "kpo",
  "national sale manager",
  "regional sale manager",
  "zone sale manager",
  "territory sale manager",
  "field sale manager",
  "delivery boy",
  "vendor",
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
  [/\/dashboards\/distributor$/, "distributor.dashboard"],
  [/\/operations$/, "dashboard.operations"],
  [/\/sales-kpi$/, "dashboard.sales-kpi"],

  [/\/admin\/hr$/, "hr.overview"],
  [/\/users\/add$/, "hr.users.add"],
  [/\/users$/, "hr.users.list"],
  [/\/admin\/module-access$/, "hr.module-access"],
  [/\/distributor\/hr$/, "distributor.hr"],
  [/\/distributor\/users\/add$/, "distributor.hr"],
  [/\/distributor\/users$/, "distributor.hr"],

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
  [/\/warehouseManager\/stock-summary$/, "warehouse-inventory.summary"],
  [/\/warehouseManager\/inward-outward$/, "warehouse-inventory.ledger"],
  [/\/warehouseManager\/goods-receipts$/, "procurement.grn"],
  [/\/warehouseManager\/dispatch-preparation$/, "logistics.dispatch"],
  [/\/warehouseManager\/stock-adjustment$/, "warehouse-inventory.ledger"],
  [/\/warehouseManager\/damage-expiry$/, "warehouse-inventory.near-expiry"],
  [/\/warehouseManager\/order-management$/, "order-management.overview"],
  [/\/order-management\/sales-orders$/, "order-management.overview"],
  [/\/order-management\/approvals$/, "order-management.overview"],
  [/\/order-management\/dispatch$/, "order-management.overview"],
  [/\/brandManager\/primary-order-request$/, "order-management.primary"],
  [/\/distributor\/inventory$/, "distributor.inventory"],
  [/\/distributor\/stock-received$/, "distributor.inventory"],
  [/\/distributor\/stock-availability$/, "distributor.inventory"],
  [/\/distributor\/stock-movements$/, "distributor.inventory"],
  [/\/distributor\/stock-adjustment$/, "distributor.inventory"],
  [/\/distributor\/damage-expiry$/, "distributor.inventory"],
  [/\/distributor\/primary-order-request$/, "distributor.primary-order"],
  [/\/supplier\/primary-orders$/, "supplier.primary-orders"],
  [/\/brandManager\/orders$/, "order-management.primary"],
  [/\/distributor\/orders$/, "distributor.secondary-order"],
  [/\/orderBooker\/day-plan$/, "order-management.secondary"],
  [/\/orderBooker\/customers$/, "order-management.secondary"],
  [/\/orderBooker\/order-status$/, "order-management.secondary"],
  [/\/orderBooker\/collections$/, "finance.receipts"],
  [/\/orderBooker\/visits$/, "order-management.secondary"],
  [/\/orderBooker\/orders$/, "order-management.secondary"],
  [/\/customer\/invoices$/, "finance.receipts"],
  [/\/customer\/outstanding$/, "finance.receipts"],
  [/\/customer\/payment-history$/, "finance.receipts"],
  [/\/customer\/returns$/, "order-management.return-stock"],
  [/\/customer\/orders$/, "order-management.secondary"],
  [/\/salesman\/day-plan$/, "order-management.secondary"],
  [/\/salesman\/customers$/, "order-management.secondary"],
  [/\/salesman\/deliveries$/, "order-management.secondary"],
  [/\/salesman\/collections$/, "finance.receipts"],
  [/\/salesman\/visits$/, "order-management.secondary"],
  [/\/salesman\/orders$/, "order-management.secondary"],
  [/\/deliveryBoy\/day-plan$/, "order-management.secondary"],
  [/\/deliveryBoy\/dispatches$/, "order-management.secondary"],
  [/\/deliveryBoy\/tracking$/, "live-tracking"],
  [/\/deliveryBoy\/exceptions$/, "order-management.secondary"],
  [/\/deliveryBoy\/orders$/, "order-management.secondary"],
  [/\/brandManager\/return-stock$/, "order-management.return-stock"],
  [/\/distributor\/return-stock$/, "distributor.return-stock"],
  [/\/distributor\/accounts$/, "distributor.payments"],
  [/\/distributor\/customer-invoices$/, "distributor.payments"],
  [/\/distributor\/aging$/, "distributor.payments"],
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
  [/\/distributor\/payments$/, "distributor.payments"],
  [/\/distributor\/payments\/primary$/, "distributor.payments"],
  [/\/distributor\/payments\/secondary$/, "distributor.payments"],

  [/\/finance$/, "finance.overview"],
  [/\/finance\/invoices$/, "finance.invoices"],
  [/\/finance\/receipts$/, "finance.receipts"],
  [/\/distributor\/receipts$/, "distributor.receipts"],
  [/\/orderBooker\/receipts$/, "finance.receipts"],
  [/\/customer\/receipts$/, "finance.receipts"],
  [/\/finance\/aging$/, "finance.aging"],

  [/\/expense$/, "expense.overview"],
  [/\/expense\/personal$/, "expense.personal"],
  [/\/expense\/daily$/, "expense.daily"],
  [/\/expense\/distributor$/, "expense.distributor"],
  [/\/distributor\/expense$/, "distributor.expense"],

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

  [/\/supplier\/messages$/, "supplier.messages"],
  [/\/supplier\/settings(?:\/change-password)?$/, "supplier.settings"],
  [/\/distributor\/messages$/, "distributor.messages"],
  [/\/distributor\/live-tracking$/, "distributor.live-tracking"],
  [/\/distributor\/reports\/.+$/, "distributor.reports"],
  [/\/distributor\/reports$/, "distributor.reports"],
  [/\/distributor\/settings(?:\/change-password)?$/, "distributor.settings"],
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


export function isLinkAllowed(href, rules = [], role = "") {
  const key = mapHrefToRuleKey(href);
  if (!key) return true;
  const rule = getRuleByKey(rules, key);
  return isRuleAllowedForRole(rule, role);
}

export function filterNavigationItems(items = [], rules = [], role = "") {
  return (items || [])
    .map((item) => {
      if (Array.isArray(item.children)) {
        const children = filterNavigationItems(item.children, rules, role);
        if (!children.length && item.type !== "link") return null;
        return { ...item, children };
      }
      return isLinkAllowed(item.href, rules, role) ? item : null;
    })
    .filter(Boolean);
}

export function summarizeAccess(rules = [], role = "") {
  const normalizedRole = normalizeRole(role);
  const total = Array.isArray(rules) ? rules.length : 0;
  const allowed = (rules || []).filter((rule) => isRuleAllowedForRole(rule, normalizedRole)).length;
  return { total, allowed, blocked: Math.max(total - allowed, 0) };
}
