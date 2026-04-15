export const SYSTEM_ADMIN_USER_ROLES = [
  "System Admin",
  "Company Admin",
  "Purchase Manager",
  "Brand Manager",
  "Warehouse Manager",
  "Finance / Accounts",
  "Dispatch / Logistics",
  "Supplier",
  "Distributor",
  "Distributor Accountant",
  "Distributor Store Manager",
  "Order Booker",
  "Salesman",
  "Driver / Delivery",
  "Customer",
];

export const COMPANY_USER_ROLES = [
  "Purchase Manager",
  "Brand Manager",
  "Warehouse Manager",
  "Finance / Accounts",
  "Dispatch / Logistics",
  "Supplier",
  "Distributor",
];

export const DISTRIBUTOR_TEAM_ROLES = [
  "Distributor Accountant",
  "Distributor Store Manager",
  "Order Booker",
  "Salesman",
  "Driver / Delivery",
  "Customer",
];

export const AIM_USER_ROLES = SYSTEM_ADMIN_USER_ROLES;

export function getAvailableRolesForActor({ actorRole = "", distributorMode = false } = {}) {
  const normalizedActorRole = String(actorRole || "").trim().toLowerCase();
  if (distributorMode || normalizedActorRole === "distributor") return DISTRIBUTOR_TEAM_ROLES;
  if (normalizedActorRole === "company admin") return COMPANY_USER_ROLES;
  return SYSTEM_ADMIN_USER_ROLES;
}

export const COMMON_USER_FIELDS = ["fullName", "email", "mobileNumber", "cnicNo", "password", "address"];

export const ROLE_EXTRA_FIELDS = {
  "System Admin": [],
  "Company Admin": [],
  "Purchase Manager": ["warehouse"],
  "Brand Manager": ["warehouse", "region", "zone", "territory", "field"],
  "Warehouse Manager": ["warehouse"],
  "Finance / Accounts": ["warehouse"],
  "Dispatch / Logistics": ["warehouse"],
  Supplier: ["warehouse"],
  Distributor: ["warehouse", "region", "zone", "territory"],
  "Distributor Accountant": ["warehouse", "region", "zone", "territory"],
  "Distributor Store Manager": ["warehouse", "region", "zone", "territory"],
  "Order Booker": ["warehouse", "region", "zone", "territory", "field"],
  Salesman: ["warehouse", "region", "zone", "territory", "field"],
  "Driver / Delivery": ["warehouse", "region", "zone", "territory", "field"],
  Customer: ["businessType", "businessName", "warehouse", "region", "zone", "territory", "field"],
};

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
