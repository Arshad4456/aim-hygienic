import UserDashboardShell from "../components/userDashboardShell";
import SalesmanDeliveriesModule from "../components/SalesmanDeliveriesModule";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Supplier Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
    >
      <SalesmanDeliveriesModule
        fetchPath="/orders/supplier-deliveries?limit=500"
        title="Primary Dispatch Queue"
        subtitle="Approved primary orders for your mapped warehouse(s). Dispatch first, then upload POD."
        emptyMessage="No primary deliveries found for your mapped warehouse(s)."
      />
    </UserDashboardShell>
  );
}
