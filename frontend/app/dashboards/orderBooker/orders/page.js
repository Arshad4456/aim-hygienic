import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Order Booker Requests" roleKey="Order Booker" links={userDashboardSearchItems.orderBooker || []} />;
}
