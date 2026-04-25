import ReturnStockRequestModule from "../../components/ReturnStockRequestModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Dashboard"
      subtitle="Manage distributor modules from the sidebar."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <ReturnStockRequestModule role="Distributor" />
    </UserDashboardShell>
  );
}