import UserDashboardShell from "../components/UserDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Regional Sale Manager Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Regional Sale Manager"
      links={userDashboardSearchItems.regionalSM || []}
    />
  );
}
