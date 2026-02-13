import UserDashboardShell from "../components/UserDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Field Sale Manager Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Field Sale Manager"
      links={userDashboardSearchItems.fieldSM || []}
    />
  );
}
