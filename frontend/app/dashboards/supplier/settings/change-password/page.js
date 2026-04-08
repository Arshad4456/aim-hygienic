import UserChangePasswordView from "../../../components/UserChangePasswordView";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";

export default function SupplierChangePasswordPage() {
  return (
    <UserDashboardShell
      title="Supplier Dashboard"
      subtitle="Manage supplier account settings from the sidebar."
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
    >
      <UserChangePasswordView titlePrefix="Supplier" />
    </UserDashboardShell>
  );
}
