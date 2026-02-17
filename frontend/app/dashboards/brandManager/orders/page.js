import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Brand Manager Order Desk" roleKey="Brand Manager" links={userDashboardSearchItems.brandManager || []} canConfirmReceipt />;
}