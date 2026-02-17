import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Salesman Delivery Queue" roleKey="Salesman" links={userDashboardSearchItems.salesman || []} canUploadProof />;
}