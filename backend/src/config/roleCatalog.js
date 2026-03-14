const ROLE_CATALOG = {
  super_admin: { code: "super_admin", label: "Super Admin", aliases: ["super admin", "superadmin"] },
  admin: { code: "admin", label: "Admin", aliases: ["system admin"] },
  ceo: { code: "ceo", label: "CEO", aliases: [] },
  managing_director: { code: "managing_director", label: "Managing Director", aliases: ["manage director"] },
  warehouse_manager: { code: "warehouse_manager", label: "Warehouse Manager", aliases: [] },
  account_officer: { code: "account_officer", label: "Account Officer", aliases: [] },
  hr_assistant: { code: "hr_assistant", label: "HR Assistant", aliases: [] },
  cashier: { code: "cashier", label: "Cashier", aliases: [] },
  kpo: { code: "kpo", label: "KPO", aliases: [] },
  brand_manager: { code: "brand_manager", label: "Brand Manager", aliases: [] },
  national_sale_manager: { code: "national_sale_manager", label: "National Sale Manager", aliases: ["national sales manager", "national sm"] },
  regional_sale_manager: { code: "regional_sale_manager", label: "Regional Sale Manager", aliases: ["regional sales manager", "regional sm"] },
  zone_sale_manager: { code: "zone_sale_manager", label: "Zone Sale Manager", aliases: ["zone sales manager", "zone sm"] },
  territory_sale_manager: { code: "territory_sale_manager", label: "Territory Sale Manager", aliases: ["territory sales manager", "territory sm"] },
  distributor: { code: "distributor", label: "Distributor", aliases: [] },
  field_sale_manager: { code: "field_sale_manager", label: "Field Sale Manager", aliases: ["field sales manager", "field sm"] },
  order_booker: { code: "order_booker", label: "Order Booker", aliases: [] },
  salesman: { code: "salesman", label: "Salesman", aliases: [] },
  delivery_boy: { code: "delivery_boy", label: "Delivery Boy", aliases: [] },
  customer: { code: "customer", label: "Customer", aliases: [] },
};

const ROLE_LOOKUP = Object.values(ROLE_CATALOG).reduce((acc, item) => {
  const keys = [item.code, item.label, ...(item.aliases || [])];
  keys.forEach((key) => {
    const normalized = String(key || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (normalized) acc[normalized] = item.code;
  });
  return acc;
}, {});

function normalizeRoleCode(role) {
  const normalized = String(role || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return ROLE_LOOKUP[normalized] || normalized || '';
}

function getRoleMeta(role) {
  const code = normalizeRoleCode(role);
  return ROLE_CATALOG[code] || { code, label: String(role || code || '').trim() || 'Unknown Role', aliases: [] };
}

function isSuperAdminRole(role) {
  const code = normalizeRoleCode(role);
  return code === 'super_admin' || code === 'admin';
}

module.exports = { ROLE_CATALOG, normalizeRoleCode, getRoleMeta, isSuperAdminRole };
