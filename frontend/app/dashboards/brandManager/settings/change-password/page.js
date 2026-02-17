import UserChangePasswordView from "../../../components/UserChangePasswordView";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Brand Manager Dashboard"
      subtitle="Manage brand modules from the sidebar."
      roleKey="Brand Manager"
      links={userDashboardSearchItems.brandManager || []}
      showAccountCards
    >
      <UserChangePasswordView titlePrefix="Brand Manager" />
    </UserDashboardShell>
  );
}
