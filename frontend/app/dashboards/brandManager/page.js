import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";
import BrandManagerWorkspace from "./components/BrandManagerWorkspace";

export default function Page() {
  return (
    <UserDashboardShell
      title="Brand Manager Dashboard"
      subtitle="Direct brand-channel planning, primary order requests, returns, and messages in one shared workspace."
      roleKey="Brand Manager"
      links={userDashboardSearchItems.brandManager || []}
      showAccountCards
    >
      <BrandManagerWorkspace />
    </UserDashboardShell>
  );
}
