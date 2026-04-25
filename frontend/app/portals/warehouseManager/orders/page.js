import UserOrderCenter from "../../components/UserOrderCenter";
import { userDashboardSearchItems } from "../../searchItems";

export default function Page() {
  return <UserOrderCenter title="Warehouse Order Queue" roleKey="Warehouse Manager" links={userDashboardSearchItems.warehouseManager || []} />;
}