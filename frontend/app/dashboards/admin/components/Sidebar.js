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
  return <span className={common}>•</span>;
}

export default function Sidebar({ user, variant = "desktop", onClose, collapsed = false }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState({
    products: true,
    company: false,
    expense: false,
    customer: false,
    supplier: false,
    qc: false,
    route: false,
    purchase: false,
    orders: false,
    territory: false,
    users: false,
    inventory: false,
  });

  const menu = useMemo(
    () => [
      { type: "link", title: "Dashboard", href: "/dashboards/admin", icon: "dashboard" },
      { type: "link", title: "Sales KPI", href: "/dashboards/admin/sales-kpi", badge: "Premium", icon: "sales" },

{
  type: "group",
  key: "company",
  title: "Company Management",
  icon: "account", // you can change icon name if you want
  children: [
    { title: "Add New Company", href: "/dashboards/admin/companies/add" },
    { title: "Company List", href: "/dashboards/admin/companies" },
  ],
},


      { type: "group", key: "products", title: "Products Management", icon: "products", children: [
        { title: "Add New Product", href: "/dashboards/admin/products/add" },
        { title: "View Product List", href: "/dashboards/admin/products" },
        { title: "Product Barcode List", href: "/dashboards/admin/products/barcodes" },
        { title: "Price Change", href: "/dashboards/admin/products/price-change" },
      ]},

      { type: "group", key: "inventory", title: "Warehouse & Inventory", icon: "inventory", children: [
        { title: "Warehouse Master", href: "/dashboards/admin/inventory/warehouses" },
        { title: "Inventory Ledger", href: "/dashboards/admin/inventory/ledger" },
        { title: "Stock Transfers", href: "/dashboards/admin/inventory/transfers" },
        { title: "Stock Summary", href: "/dashboards/admin/inventory/summary" },
        { title: "Low Stock Alerts", href: "/dashboards/admin/inventory/low-stock" },
      ]},

      { type: "group", key: "territory", title: "Territory & Assets", icon: "territory", children: [
        { title: "Add Warehouse", href: "/dashboards/admin/warehouses/add" },
        { title: "Warehouse List", href: "/dashboards/admin/warehouses" },
        { title: "Add Region", href: "/dashboards/admin/regions/add" },
        { title: "Region List", href: "/dashboards/admin/regions" },
        { title: "Add Zone", href: "/dashboards/admin/zones/add" },
        { title: "Zone List", href: "/dashboards/admin/zones" },
        { title: "Add Area", href: "/dashboards/admin/areas/add" },
        { title: "Area List", href: "/dashboards/admin/areas" },
        { title: "Add Vehicle", href: "/dashboards/admin/assets/vehicles/add" },
        { title: "Vehicle List", href: "/dashboards/admin/assets/vehicles" },
      ]},

      { type: "group", key: "expense", title: "Expense Management", icon: "expense", children: [
        { title: "Add Expense", href: "/dashboards/admin/expense/add" },
        { title: "View Expense List", href: "/dashboards/admin/expense" },
      ]},

      { type: "link", title: "Account Management", href: "/dashboards/admin/account/manage", icon: "account" },

      { type: "group", key: "customer", title: "Customer Management", icon: "customer", children: [
        { title: "Add New Customer", href: "/dashboards/admin/customers/add" },
        { title: "View Customer List", href: "/dashboards/admin/customers" },
        { title: "User Credit Limit", href: "/dashboards/admin/customers/credit-limit" },
        { title: "Customer Coupon Policy", href: "/dashboards/admin/customers/coupon-policy" },
        {
          title: "Discount Policy",
          href: "/dashboards/admin/customers/discount-policy",
          children: [
            { title: "Item Policy", href: "/dashboards/admin/customers/discount-policy/item" },
            { title: "Group Policy", href: "/dashboards/admin/customers/discount-policy/group" },
            { title: "Company Policy", href: "/dashboards/admin/customers/discount-policy/company" },
          ],
        },
      ]},

      { type: "group", key: "supplier", title: "Supplier Management", icon: "supplier", children: [
        { title: "Add New Supplier", href: "/dashboards/admin/suppliers/add" },
        { title: "View Supplier List", href: "/dashboards/admin/suppliers" },
      ]},

      { type: "group", key: "users", title: "User Management", icon: "users", children: [
        { title: "Add User", href: "/dashboards/admin/users/add" },
        { title: "User List", href: "/dashboards/admin/users" },
      ]},

      { type: "group", key: "qc", title: "Quality Control", icon: "qc", children: [
        { title: "Raw Material QC", href: "/dashboards/admin/qc/raw-material" },
        { title: "Production QC", href: "/dashboards/admin/qc/production" },
        { title: "Finished Goods QC", href: "/dashboards/admin/qc/finished-goods" },
        { title: "Final Release QC", href: "/dashboards/admin/qc/final-release" },
      ]},

      { type: "link", title: "Finance/Accounts", href: "/dashboards/admin/finance", icon: "finance" },

      { type: "group", key: "route", title: "Route Management", icon: "route", children: [
        { title: "Add Route", href: "/dashboards/admin/route/add" },
        { title: "View Route List", href: "/dashboards/admin/route" },
        { title: "Add Planner", href: "/dashboards/admin/route/planner/add" },
        { title: "View Planner List", href: "/dashboards/admin/route/planner" },
      ]},

      { type: "link", title: "Scheme Management", href: "/dashboards/admin/schemes", icon: "scheme" },

      { type: "group", key: "purchase", title: "Purchase Management", icon: "purchase", children: [
        { title: "Purchase Challan", href: "/dashboards/admin/purchase/challan" },
        { title: "Purchase Order", href: "/dashboards/admin/purchase/order" },
        { title: "Purchase Invoice", href: "/dashboards/admin/purchase/invoice" },
        { title: "Purchase Return", href: "/dashboards/admin/purchase/return" },
        { title: "Stock Transfer", href: "/dashboards/admin/purchase/stock-transfer" },
        { title: "View Transfered Stock", href: "/dashboards/admin/purchase/transferred-stock" },
      ]},

      { type: "link", title: "Delivery Management", href: "/dashboards/admin/delivery", icon: "delivery" },

      { type: "group", key: "orders", title: "Orders Management", icon: "orders", children: [
        { title: "Show Orders List", href: "/dashboards/admin/orders" },
        { title: "Secondary Orders List", href: "/dashboards/admin/orders/secondary" },
      ]},

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

  const widthClass =
    variant === "desktop"
      ? collapsed
        ? "w-[84px]"
        : "w-[280px]"
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
                onClick={() => setOpen((s) => ({ ...s, [item.key]: !s[item.key] }))}
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
                            onClick={() => setOpen((s) => ({ ...s, [key]: !s[key] }))}
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
                        {c.title}
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