"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function Icon({ name }) {
  // No extra library required — simple, safe icons
  const common = "h-5 w-5";
  if (name === "dashboard") return <span className={common}>📊</span>;
  if (name === "sales") return <span className={common}>💹</span>;
  if (name === "products") return <span className={common}>📦</span>;
  if (name === "expense") return <span className={common}>🧾</span>;
  if (name === "account") return <span className={common}>👤</span>;
  if (name === "customer") return <span className={common}>🧑‍🤝‍🧑</span>;
  if (name === "supplier") return <span className={common}>🏭</span>;
  if (name === "qc") return <span className={common}>✅</span>;
  if (name === "finance") return <span className={common}>💰</span>;
  if (name === "route") return <span className={common}>🗺️</span>;
  if (name === "scheme") return <span className={common}>🎁</span>;
  if (name === "purchase") return <span className={common}>🛒</span>;
  if (name === "delivery") return <span className={common}>🚚</span>;
  if (name === "orders") return <span className={common}>🧺</span>;
  if (name === "tracking") return <span className={common}>📍</span>;
  if (name === "reports") return <span className={common}>📄</span>;
  if (name === "settings") return <span className={common}>⚙️</span>;
  if (name === "territory") return <span className={common}>🧭</span>;
  if (name === "users") return <span className={common}>🧑‍💼</span>;
  if (name === "inventory") return <span className={common}>🏬</span>;
  if (name === "logistics") return <span className={common}>🧭</span>;
  if (name === "hr") return <span className={common}>👥</span>;
  if (name === "messages") return <span className={common}>💬</span>;
  if (name === "operations") return <span className={common}>🛰️</span>;
  if (name === "vehicle") return <span className={common}>🚘</span>;
  return <span className={common}>•</span>;
}


const defaultOpenState = {
  dashboard: false,
  company: false,
  hr: false,
  products: false,
  expense: false,
  qc: false,
  procurement: false,
  orders: false,
  logistics: false,
  finance: false,
  territory: false,
  users: false,
  inventory: false,
  accountManagement: false,
  vehicleManagement: false,
};

let adminSidebarOpenCache = { ...defaultOpenState };

export default function Sidebar({ user, variant = "desktop", onClose, collapsed = false }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(() => ({ ...adminSidebarOpenCache }));

  const menu = useMemo(
    () => [
      {
        type: "group",
        key: "dashboard",
        title: "Dashboard",
        icon: "dashboard",
        children: [
          { title: "Dashboard Overview", href: "/dashboards/admin" },
          { title: "Operations Command Center", href: "/dashboards/admin/operations" },
          { title: "Sales KPI", href: "/dashboards/admin/sales-kpi" },
        ],
      },

      {
        type: "group",
        key: "company",
        title: "Company Management",
        icon: "account",
        children: [
          { title: "Add New Company", href: "/dashboards/admin/companies/add" },
          { title: "Company List", href: "/dashboards/admin/companies" },
        ],
      },

      {
        type: "group",
        key: "hr",
        title: "HR & Role Management",
        icon: "hr",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/hr" },
          { title: "Add User", href: "/dashboards/admin/users/add" },
          { title: "User List", href: "/dashboards/admin/users" },
        ],
      },

      {
        type: "group",
        key: "products",
        title: "Products Management",
        icon: "products",
        children: [
          { title: "Add New Product", href: "/dashboards/admin/products/add" },
          { title: "View Product List", href: "/dashboards/admin/products" },
          { title: "Product Barcode List", href: "/dashboards/admin/products/barcodes" },
          { title: "Price Change", href: "/dashboards/admin/products/price-change" },
        ],
      },

      {
        type: "group",
        key: "inventory",
        title: "Warehouse & Inventory",
        icon: "inventory",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/warehouse-inventory" },
          { title: "Warehouse Master", href: "/dashboards/admin/inventory/warehouses" },
        ],
      },

      {
        type: "group",
        key: "territory",
        title: "Territory & Assets",
        icon: "territory",
        children: [
          { title: "Add Warehouse", href: "/dashboards/admin/warehouses/add" },
          { title: "Warehouse List", href: "/dashboards/admin/warehouses" },
          { title: "Add Region", href: "/dashboards/admin/regions/add" },
          { title: "Region List", href: "/dashboards/admin/regions" },
          { title: "Add Zone", href: "/dashboards/admin/zones/add" },
          { title: "Zone List", href: "/dashboards/admin/zones" },
          { title: "Add Territory", href: "/dashboards/admin/areas/add" },
          { title: "Territory List", href: "/dashboards/admin/areas" },
          { title: "Add Field", href: "/dashboards/admin/fields/add" },
          { title: "Field List", href: "/dashboards/admin/fields" },
          { title: "Add Vehicle", href: "/dashboards/admin/assets/vehicles/add" },
          { title: "Vehicle List", href: "/dashboards/admin/assets/vehicles" },
        ],
      },

      {
        type: "group",
        key: "orders",
        title: "Order Management",
        icon: "orders",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/order-management" },
          { title: "Sales Orders", href: "/dashboards/admin/order-management/sales-orders" },
          { title: "Order Approvals", href: "/dashboards/admin/order-management/approvals" },
          { title: "Pick & Dispatch", href: "/dashboards/admin/order-management/dispatch" },
          { title: "Returns & Claims", href: "/dashboards/admin/order-management/returns" },
        ],
      },

      {
        type: "group",
        key: "vehicleManagement",
        title: "Vehicle Management",
        icon: "vehicle",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/vehicle-management" },
          { title: "Add Vehicle", href: "/dashboards/admin/vehicle-management/add" },
          { title: "Vehicle List", href: "/dashboards/admin/vehicle-management/vehicles" },
          { title: "Fuel Management", href: "/dashboards/admin/vehicle-management/fuel-management" },
          { title: "Vehicle Maintenance", href: "/dashboards/admin/vehicle-management/maintenance" },
        ],
      },

      {
        type: "group",
        key: "accountManagement",
        title: "Account Management",
        icon: "account",
        children: [
          { title: "Account Detail", href: "/dashboards/admin/account/manage" },
          { title: "Loan Detail", href: "/dashboards/admin/account/loan-detail" },
          { title: "Payment Management", href: "/dashboards/admin/finance/payments" },
        ],
      },

      {
        type: "group",
        key: "finance",
        title: "Finance & Accounts",
        icon: "finance",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/finance" },
          { title: "Invoices", href: "/dashboards/admin/finance/invoices" },
          { title: "Receipts", href: "/dashboards/admin/finance/receipts" },
          { title: "Aging Report", href: "/dashboards/admin/finance/aging" },
        ],
      },

      {
        type: "group",
        key: "expense",
        title: "Expense Management",
        icon: "expense",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/expense" },
          { title: "AIM – Personal Expense", href: "/dashboards/admin/expense/personal" },
          { title: "Daily Expense", href: "/dashboards/admin/expense/daily" },
          { title: "Distributor Expense", href: "/dashboards/admin/expense/distributor" },
        ],
      },

      {
        type: "group",
        key: "procurement",
        title: "Procurement",
        icon: "purchase",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/procurement" },
          { title: "Supplier Master", href: "/dashboards/admin/procurement/suppliers" },
          { title: "Purchase Orders", href: "/dashboards/admin/procurement/purchase-orders" },
          { title: "Goods Receipt (GRN)", href: "/dashboards/admin/procurement/grn" },
          { title: "Supplier Payments", href: "/dashboards/admin/procurement/payments" },
        ],
      },

      {
        type: "group",
        key: "logistics",
        title: "Distribution & Logistics",
        icon: "logistics",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/logistics" },
          { title: "Route Planning", href: "/dashboards/admin/logistics/routes" },
          { title: "Dispatch & Delivery", href: "/dashboards/admin/logistics/dispatch" },
          { title: "Vehicle Assignment", href: "/dashboards/admin/assets/vehicles" },
        ],
      },

      {
        type: "group",
        key: "qc",
        title: "Quality & Compliance",
        icon: "qc",
        children: [
          { title: "Module Overview", href: "/dashboards/admin/quality" },
          { title: "Raw Material QC", href: "/dashboards/admin/quality/raw-material" },
          { title: "Production QC", href: "/dashboards/admin/quality/production" },
          { title: "Finished Goods QC", href: "/dashboards/admin/quality/finished-goods" },
          { title: "Final Release QC", href: "/dashboards/admin/quality/final-release" },
        ],
      },
      { type: "link", title: "Messages", href: "/dashboards/admin/messages", icon: "messages" },
      { type: "link", title: "User Live Tracking", href: "/dashboards/admin/live-tracking", icon: "tracking" },
      { type: "link", title: "Reports", href: "/dashboards/admin/reports", icon: "reports" },
      { type: "link", title: "Settings", href: "/dashboards/admin/settings", icon: "settings" },
    ],
    []
  );

  function go(href) {
    router.push(href);
    if (variant === "mobile" && onClose) onClose();
  }

  function toggleOpen(key) {
    setOpen((state) => {
      const next = { ...state, [key]: !state[key] };
      adminSidebarOpenCache = next;
      return next;
    });
  }

  const widthClass =
    variant === "desktop"
      ? collapsed
        ? "w-[70px]"
        : "w-[260px]"
      : "w-[290px]";

  return (
    <aside
      className={[
        "h-screen flex flex-col border-r bg-white",
        variant === "desktop" ? "hidden md:flex" : "flex",
        widthClass,
      ].join(" ")}
    >
      {/* Header (not scrolling) */}
      <div className="shrink-0 px-4 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold">AH</span>
          </div>

          {!collapsed ? (
            <div className="leading-tight">
              <div className="font-semibold text-zinc-900">Admin</div>
              <div className="text-xs text-zinc-500">{user?.fullName || "System Admin"}</div>
            </div>
          ) : null}
        </div>

        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Nav (THIS scrolls independently) */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {menu.map((item) => {
          // LINK
          if (item.type === "link") {
            const active = pathname === item.href;
            return (
              <button
                key={item.title}
                onClick={() => go(item.href)}
                className={[
                  "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm mb-1",
                  active ? "bg-emerald-50 text-emerald-700" : "text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
                title={collapsed ? item.title : undefined}
              >
                <span className="flex items-center gap-2">
                  <Icon name={item.icon} />
                  {!collapsed ? <span>{item.title}</span> : null}
                </span>

                {!collapsed && item.badge ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          }

          // GROUP
          const isOpen = !!open[item.key];

          return (
            <div key={item.title} className="mb-1">
              <button
                onClick={() => toggleOpen(item.key)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                title={collapsed ? item.title : undefined}
              >
                <span className="flex items-center gap-2">
                  <Icon name={item.icon} />
                  {!collapsed ? <span>{item.title}</span> : null}
                </span>

                {!collapsed ? <span className="text-zinc-400">{isOpen ? "▾" : "▸"}</span> : null}
              </button>

              {/* children only visible when NOT collapsed */}
              {!collapsed && isOpen ? (
                <div className="ml-2 pl-3 border-l">
                  {item.children.map((c) => {
                    if (c.children) {
                      const key = c.href;
                      const nestedOpen = !!open[key];
                      return (
                        <div key={c.title}>
                          <button
                            onClick={() => toggleOpen(key)}
                            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                          >
                            <span>{c.title}</span>
                            <span className="text-zinc-400">{nestedOpen ? "▾" : "▸"}</span>
                          </button>
                          {nestedOpen ? (
                            <div className="ml-2 pl-3 border-l">
                              {c.children.map((cc) => (
                                <button
                                  key={cc.title}
                                  onClick={() => go(cc.href)}
                                  className={[
                                    "w-full text-left rounded-lg px-3 py-2 text-sm",
                                    pathname === cc.href
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "text-zinc-600 hover:bg-zinc-50",
                                  ].join(" ")}
                                >
                                  {cc.title}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    }

                    const active = pathname === c.href;
                    return (
                      <button
                        key={c.title}
                        onClick={() => go(c.href)}
                        className={[
                          "w-full text-left rounded-lg px-3 py-2 text-sm",
                          active ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        <span className="flex items-center justify-between">
                          <span>{c.title}</span>
                          {c.badge ? (
                            <span className="ml-2 rounded-full bg-red-100 text-red-600 text-[10px] px-2 py-0.5">
                              {c.badge}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Footer removed (logout removed as requested) */}
      <div className="shrink-0 border-t px-3 py-3 text-xs text-zinc-500">
        {!collapsed ? "AIM Hygienic ERP" : "ERP"}
      </div>
    </aside>
  );
}