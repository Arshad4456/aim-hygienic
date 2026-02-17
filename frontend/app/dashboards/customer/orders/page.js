import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Customer Order Requests" roleKey="Customer" links={userDashboardSearchItems.customer || []} />;
}
