import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";
import BrandManagerWorkspace from "./components/BrandManagerWorkspace";

export default function Page() {
  return (
    <UserDashboardShell
      title="Brand Manager Dashboard"
      subtitle="Run direct-channel sales, request stock, monitor returns, and stay linked with company operations from one cleaner workspace."
      roleKey="Brand Manager"
      links={userDashboardSearchItems.brandManager || []}
      showAccountCards
    >
      <BrandManagerWorkspace />
    </UserDashboardShell>
  );
}
