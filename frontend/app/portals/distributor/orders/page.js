import DistributorSecondaryOrdersModule from "../../components/DistributorSecondaryOrdersModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Secondary Orders"
      subtitle="Review related secondary order requests and ledger records."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <DistributorSecondaryOrdersModule />
    </UserDashboardShell>
  );
}