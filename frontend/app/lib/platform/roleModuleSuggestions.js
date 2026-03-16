export const ROLE_MODULE_SUGGESTIONS = {
  company_admin: ["territory_assets", "hr_role_management", "order_management", "payment_management", "expense_management", "finance_accounts", "vehicle_management", "messages", "settings"],
  warehouse_manager: ["territory_assets", "order_management", "payment_management", "vehicle_management"],
  distributor: ["order_management", "payment_management", "expense_management", "finance_accounts", "messages", "settings"],
  order_booker: ["order_management", "finance_accounts", "messages", "settings"],
  salesman: ["order_management", "vehicle_management", "messages", "settings"],
  customer: ["order_management", "finance_accounts", "settings"],
  account_officer: ["finance_accounts", "payment_management", "expense_management", "settings"],
  delivery_boy: ["order_management", "vehicle_management"],
  brand_manager: ["order_management", "messages", "settings"],
  regional_sale_manager: ["order_management", "reports", "messages"],
  zone_sale_manager: ["order_management", "reports", "messages"],
  territory_sale_manager: ["order_management", "reports", "messages"],
};

export function getSuggestedModulesForRole(roleCode) {
  return ROLE_MODULE_SUGGESTIONS[String(roleCode || "").trim()] || [];
}
