export const MOBILE_ROUTE_REGISTRY = {
  dashboard: { label: "Dashboard", feature: "dashboard", roles: ["owner", "manager", "distributor", "salesman", "order_booker", "delivery_boy", "warehouse_manager"] },
  customers: { label: "Customers", feature: "customers", roles: ["salesman", "order_booker", "distributor", "manager"] },
  orders: { label: "Orders", feature: "orders", roles: ["salesman", "order_booker", "distributor", "customer"] },
  collections: { label: "Collections", feature: "collections", roles: ["salesman", "order_booker", "distributor"] },
  delivery: { label: "Delivery", feature: "delivery", roles: ["delivery_boy", "warehouse_manager", "manager"] },
  warehouse: { label: "Warehouse", feature: "warehouse", roles: ["warehouse_manager", "manager"] },
  inventory: { label: "Inventory", feature: "inventory", roles: ["warehouse_manager", "distributor", "manager"] },
  liveTracking: { label: "Live Tracking", feature: "live-tracking", roles: ["salesman", "order_booker", "delivery_boy", "manager"] },
  approvals: { label: "Approvals", feature: "approvals", roles: ["owner", "manager", "company_admin"] },
  messages: { label: "Messages", feature: "messages", roles: ["owner", "manager", "distributor", "salesman", "order_booker", "delivery_boy", "warehouse_manager", "customer", "supplier"] },
  profile: { label: "Profile", feature: "profile", roles: ["*"] },
};
export function getMobileModulesForRole(role) { return Object.entries(MOBILE_ROUTE_REGISTRY).filter(([, item]) => item.roles.includes("*") || item.roles.includes(role)).map(([key, item]) => ({ key, ...item })); }
