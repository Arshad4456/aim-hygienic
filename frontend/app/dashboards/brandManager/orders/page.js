import PrimaryOrderRequestModule from "../../components/PrimaryOrderRequestModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Brand Manager Order Desk"
      subtitle="Create primary sale order requests and manage receipt agreement from ledger."
      roleKey="Brand Manager"
      links={userDashboardSearchItems.brandManager || []}
      showAccountCards
    >
      <PrimaryOrderRequestModule role="Brand Manager" />
    </UserDashboardShell>
  );
}
