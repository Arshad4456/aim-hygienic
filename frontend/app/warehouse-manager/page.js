import UserDashboardShell from "../dashboards/components/userDashboardShell";

const links = [
  { title: "Warehouse & Inventory", href: "/warehouse-manager/warehouse-inventory" },
  { title: "Order Management", href: "/warehouse-manager/order-management" },
];

export default function WarehouseManagerDashboardPage() {
  return (
    <UserDashboardShell
      title="Warehouse Manager Dashboard"
      subtitle="Access warehouse-scoped inventory and order management modules."
      roleKey="Warehouse Manager"
      links={links}
    />
  );
}
