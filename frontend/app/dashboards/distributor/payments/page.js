import DistributorPaymentsModule from "../../components/DistributorPaymentsModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Payments"
      subtitle="Track primary payments received from warehouse and your settlement progress."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <DistributorPaymentsModule mode="primary" />
    </UserDashboardShell>
  );
}
