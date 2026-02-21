import SalesmanDeliveriesModule from "../../components/SalesmanDeliveriesModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Salesman Deliveries"
      subtitle="Track assigned secondary deliveries and upload proof of delivery from camera."
      roleKey="Salesman"
      links={userDashboardSearchItems.salesman || []}
      showAccountCards
    >
      <SalesmanDeliveriesModule />
    </UserDashboardShell>
  );
}