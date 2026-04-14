import UserDashboardShell from "../components/userDashboardShell";
import { userDashboardSearchItems } from "../searchItems";
import DistributorWorkspace from "./components/DistributorWorkspace";

export default function Page() {
  return (
    <UserDashboardShell
      title="Distributor Dashboard"
      subtitle="Run stock, sales, recovery, payable-to-company, and expense visibility from one V2-first command center."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <DistributorWorkspace />
    </UserDashboardShell>
  );
}
