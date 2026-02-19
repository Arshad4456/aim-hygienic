import SecondaryOrderRequestModule from "../../components/SecondaryOrderRequestModule";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <SecondaryOrderRequestModule title="Order Management" roleKey="Order Booker" links={userDashboardSearchItems.orderBooker || []} />;
}
