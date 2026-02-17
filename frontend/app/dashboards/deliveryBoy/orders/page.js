import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Delivery Boy Proof Desk" roleKey="Delivery Boy" links={userDashboardSearchItems.deliveryBoy || []} canUploadProof />;
}