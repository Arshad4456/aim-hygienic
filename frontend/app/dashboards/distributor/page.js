import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    />
  );
}