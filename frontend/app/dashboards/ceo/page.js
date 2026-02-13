import UserDashboardShell from "../components/UserDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="CEO Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="CEO"
      links={userDashboardSearchItems.ceo || []}
    />
  );
}
