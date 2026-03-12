import UserDashboardShell from "../components/userDashboardShell";
import SalesmanSecondaryOrdersTable from "../components/SalesmanSecondaryOrdersTable";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Salesman Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Salesman"
      links={userDashboardSearchItems.salesman || []}
    >
      <SalesmanSecondaryOrdersTable />
    </UserDashboardShell>
  );
}
