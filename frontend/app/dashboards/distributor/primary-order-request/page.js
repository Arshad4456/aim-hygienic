import PrimaryOrderRequestModule from "../../components/PrimaryOrderRequestModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Primary Order Request"
      subtitle="Create and track primary sale order requests."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <PrimaryOrderRequestModule role="Distributor" />
    </UserDashboardShell>
  );
}