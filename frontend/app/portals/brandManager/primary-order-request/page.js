import PrimaryOrderRequestModule from "../../components/PrimaryOrderRequestModule";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Brand Manager Primary Order Request"
      subtitle="Create and track primary sale order requests."
      roleKey="Brand Manager"
      links={userDashboardSearchItems.brandManager || []}
      showAccountCards
    >
      <PrimaryOrderRequestModule role="Brand Manager" />
    </UserDashboardShell>
  );
}