import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";

const cards = [
  {
    title: "Add User",
    description: "Create salesman, order booker, and customer records for your territory.",
    href: "/dashboards/distributor/users/add",
  },
  {
    title: "User List",
    description: "Manage salesman, order booker, and customer records assigned to your territory.",
    href: "/dashboards/distributor/users",
  },
];

export default function DistributorHrModulePage() {
  return (
    <UserDashboardShell
      title="Distributor HR & Role Management"
      subtitle="Manage your team and customer records within your assigned territory."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
    >
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">HR & Role Management</div>
        <div className="text-sm text-zinc-500 mt-1">
          Distributor can manage only Salesman, Order Booker, and customer users in own territory.
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow"
            >
              <div className="text-sm font-semibold text-zinc-900">{card.title}</div>
              <div className="text-xs text-zinc-500 mt-2">{card.description}</div>
            </a>
          ))}
        </div>
      </div>
    </UserDashboardShell>
  );
}