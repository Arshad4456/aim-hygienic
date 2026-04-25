import SupplierPrimaryOrdersModule from "../../components/SupplierPrimaryOrdersModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function SupplierPrimaryOrdersPage() {
  return (
    <UserDashboardShell
      title="Supplier Primary Orders"
      subtitle="Assigned primary orders and proof of delivery"
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
      showAccountCards
    >
      <SupplierPrimaryOrdersModule />
    </UserDashboardShell>
  );
}
