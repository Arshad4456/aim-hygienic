import UserMessagesView from "../../components/UserMessagesView";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Brand Manager Dashboard"
      subtitle="Manage brand modules from the sidebar."
      roleKey="Brand Manager"
      links={userDashboardSearchItems.brandManager || []}
      showAccountCards
    >
      <UserMessagesView titlePrefix="Brand Manager" />
    </UserDashboardShell>
  );
}
