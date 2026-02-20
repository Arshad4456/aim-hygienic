import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Warehouse Manager Dashboard"
      subtitle="Access warehouse-scoped inventory and order management modules."
      roleKey="Warehouse Manager"
      links={userDashboardSearchItems.warehouseManager || []}
    />
  );
}