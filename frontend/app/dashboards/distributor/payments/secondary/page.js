import DistributorPaymentsModule from "../../../components/DistributorPaymentsModule";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Secondary Payments (Paid Back)"
      subtitle="Review all your settlement payments made against warehouse invoices."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <DistributorPaymentsModule mode="secondary" />
    </UserDashboardShell>
  );
}
