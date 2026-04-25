import UserMessagesView from "../../components/UserMessagesView";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function SupplierMessagesPage() {
  return (
    <UserDashboardShell
      title="Supplier Dashboard"
      subtitle="Supplier alerts and notifications."
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
    >
      <UserMessagesView titlePrefix="Supplier" />
    </UserDashboardShell>
  );
}
