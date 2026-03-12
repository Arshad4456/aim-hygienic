export const AIM_USER_ROLES = [
  "Super Admin",
  "Admin",
  "CEO",
  "Managing Director",
  "Warehouse Manager",
  "Account Officer",
  "HR Assistant",
  "Cashier",
  "KPO",
  "National Sale Manager",
  "Regional Sale Manager",
  "Zone Sale Manager",
  "Territory Sale Manager",
  "Distributor",
  "Field Sale Manager",
  "Order Booker",
  "Salesman",
  "Delivery Boy",
  "customer",
  "Brand Manager",
];

export const COMMON_USER_FIELDS = ["fullName", "email", "mobileNumber", "cnicNo", "password", "address"];

export const ROLE_EXTRA_FIELDS = {
  SuperAdmin: [],
  admin: [],
  CEO: [],
  "Managing Director": [],
  "Warehouse Manager": ["warehouse"],
  "Account Officer": ["warehouse"],
  "HR Assistant": ["warehouse"],
  Cashier: ["warehouse"],
  KPO: ["warehouse"],
  "National Sale Manager": [],
  "Regional Sale Manager": ["warehouse", "region"],
  "Zone Sale Manager": ["warehouse", "region", "zone"],
  "Territory Sale Manager": ["warehouse", "region", "zone", "territory"],
  Distributor: ["warehouse", "region", "zone", "territory"],
  "Field Sale Manager": ["warehouse", "region", "zone", "territory", "field"],
  "Order Booker": ["warehouse", "region", "zone", "territory", "field"],
  Salesman: ["warehouse", "region", "zone", "territory", "field"],
  "Delivery Boy": ["warehouse", "region", "zone", "territory", "field"],
  customer: ["businessType", "businessName", "warehouse", "region", "zone", "territory", "field"],
  "Brand Manager": ["businessType", "businessName", "warehouse", "region", "zone", "territory", "field"],
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