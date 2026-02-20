import PrimaryOrderRequestModule from "../../components/PrimaryOrderRequestModule";
import DistributorSecondaryOrdersModule from "../../components/DistributorSecondaryOrdersModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Order Desk"
      subtitle="Create primary sale order requests and manage receipt agreement from ledger."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <PrimaryOrderRequestModule role="Distributor" />
      <DistributorSecondaryOrdersModule />
    </UserDashboardShell>
  );
}
