import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";

export default function Page() {
  return (
    <UserDashboardShell
      title="Supplier Dashboard"
      subtitle="Use quick search to open assigned supplier modules and primary-order POD workflow."
      roleKey="Supplier"
      links={userDashboardSearchItems.supplier || []}
    />
  );
}