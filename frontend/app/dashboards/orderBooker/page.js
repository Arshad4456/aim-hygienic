import UserDashboardShell from "../components/UserDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Order Booker Dashboard"
      subtitle="Use quick search to navigate all available items for your dashboard."
      roleKey="Order Booker"
      links={userDashboardSearchItems.orderBooker || []}
    />
  );
}
