import { ROLE_CATALOG, ROLE_OPTIONS, getRoleLabel } from '../../../lib/platform/roleCatalog';

export const AIM_USER_ROLES = ROLE_OPTIONS;

export const COMMON_USER_FIELDS = ["fullName", "email", "mobileNumber", "cnicNo", "password", "address"];

const ROLE_EXTRA_FIELDS_BY_CODE = {
  super_admin: [],
  admin: [],
  ceo: [],
  managing_director: [],
  warehouse_manager: ["warehouse"],
  account_officer: ["warehouse"],
  hr_assistant: ["warehouse"],
  cashier: ["warehouse"],
  kpo: ["warehouse"],
  national_sale_manager: [],
  regional_sale_manager: ["warehouse", "region"],
  zone_sale_manager: ["warehouse", "region", "zone"],
  territory_sale_manager: ["warehouse", "region", "zone", "territory"],
  distributor: ["warehouse", "region", "zone", "territory"],
  field_sale_manager: ["warehouse", "region", "zone", "territory", "field"],
  order_booker: ["warehouse", "region", "zone", "territory", "field"],
  salesman: ["warehouse", "region", "zone", "territory", "field"],
  delivery_boy: ["warehouse", "region", "zone", "territory", "field"],
  customer: ["businessType", "businessName", "warehouse", "region", "zone", "territory", "field"],
  brand_manager: ["businessType", "businessName", "warehouse", "region", "zone", "territory", "field"],
};

export const ROLE_EXTRA_FIELDS = Object.values(ROLE_CATALOG).reduce((acc, role) => {
  acc[role.label] = ROLE_EXTRA_FIELDS_BY_CODE[role.code] || [];
  return acc;
}, {});

export function validatePassword(value) {
  if (!value || value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one symbol.";
  return "";
}

export const FIELD_LABELS = {
  fullName: "Name",
  email: "Email",
  mobileNumber: "Mobile Number",
  cnicNo: "CNIC No",
  password: "Password",
  address: "Address",
  userId: "User ID",
  role: "Role",
  warehouseName: "Warehouse Name",
  regionName: "Region Name",
  zoneName: "Zone Name",
  territoryName: "Territory Name",
  fieldName: "Field Name",
  businessType: "Business Type",
  businessName: "Business Name",
};

export { getRoleLabel };
