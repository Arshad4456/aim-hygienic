import UserChangePasswordView from "../../../components/UserChangePasswordView";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Customer Dashboard"
      subtitle="Manage customer modules from the sidebar."
      roleKey="Customer"
      links={userDashboardSearchItems.customer || []}
      showAccountCards
    >
      <UserChangePasswordView titlePrefix="Customer" />
    </UserDashboardShell>
  );
}
