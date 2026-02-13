import UserDashboardShell from "../components/UserDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Warehouse Manager Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Warehouse Manager"
      links={userDashboardSearchItems.warehouseManager || []}
    />
  );
}
