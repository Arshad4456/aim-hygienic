import UserSettingsView from "../../components/UserSettingsView";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function SupplierSettingsPage() {
  return (
    <UserDashboardShell
      title="Supplier Dashboard"
      subtitle="Manage supplier account settings from the sidebar."
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
    >
      <UserSettingsView titlePrefix="Supplier" />
    </UserDashboardShell>
  );
}
