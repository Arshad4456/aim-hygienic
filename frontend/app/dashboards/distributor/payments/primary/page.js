import DistributorPaymentsModule from "../../../components/DistributorPaymentsModule";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Primary Payments (Received)"
      subtitle="View warehouse-to-distributor invoices, balances, and deadline alerts."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <DistributorPaymentsModule mode="primary" />
    </UserDashboardShell>
  );
}