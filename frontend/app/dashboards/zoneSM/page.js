import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Zone Sale Manager Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Zone Sale Manager"
      links={userDashboardSearchItems.zoneSM || []}
    />
  );
}