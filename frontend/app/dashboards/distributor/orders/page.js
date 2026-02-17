import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Distributor Order Desk" roleKey="Distributor" links={userDashboardSearchItems.distributor || []} canConfirmReceipt />;
}
