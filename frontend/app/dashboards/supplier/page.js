import UserDashboardShell from "../components/userDashboardShell";
import SupplierWorkspace from "./components/SupplierWorkspace";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Supplier Dashboard"
      subtitle="Assigned primary orders, dispatch readiness, POD visibility, and supplier finance snapshot."
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
      showAccountCards
    >
      <SupplierWorkspace />
    </UserDashboardShell>
  );
}
