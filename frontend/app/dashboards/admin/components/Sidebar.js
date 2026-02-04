"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function Sidebar({ user, variant = "desktop", onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState({
    products: true,
    expense: false,
    customer: false,
    supplier: false,
    qc: false,
    route: false,
    purchase: false,
    orders: false,
  });

  const menu = useMemo(
    () => [
      { type: "link", title: "Dashboard", href: "/dashboards/admin" },
      { type: "link", title: "Sales KPI", href: "/dashboards/admin/sales-kpi", badge: "Premium" },

      {
        type: "group",
        key: "products",
        title: "Products Management",
        children: [
          { title: "Add New Product", href: "/dashboards/admin/products/add" },
          { title: "View Product List", href: "/dashboards/admin/products" },
          { title: "Product Barcode List", href: "/dashboards/admin/products/barcodes" },
          { title: "Price Change", href: "/dashboards/admin/products/price-change" },
        ],
      },

      {
        type: "group",
        key: "expense",
        title: "Expense Management",
        children: [
          { title: "Add Expense", href: "/dashboards/admin/expense/add" },
          { title: "View Expense List", href: "/dashboards/admin/expense" },
        ],
      },

      { type: "link", title: "Account Management", href: "/dashboards/admin/account/manage" },

      {
        type: "group",
        key: "customer",
        title: "Customer Management",
        children: [
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
        ],
      },

      {
        type: "group",
        key: "supplier",
        title: "Supplier Management",
        children: [
          { title: "Add New Supplier", href: "/dashboards/admin/suppliers/add" },
          { title: "View Supplier List", href: "/dashboards/admin/suppliers" },
        ],
      },

      {
        type: "group",
        key: "qc",
        title: "Quality Control",
        children: [
          { title: "Raw Material QC", href: "/dashboards/admin/qc/raw-material" },
          { title: "Production QC", href: "/dashboards/admin/qc/production" },
          { title: "Finished Goods QC", href: "/dashboards/admin/qc/finished-goods" },
          { title: "Final Release QC", href: "/dashboards/admin/qc/final-release" },
        ],
      },

      { type: "link", title: "Finance/Accounts", href: "/dashboards/admin/finance" },

      {
        type: "group",
        key: "route",
        title: "Route Management",
        children: [
          { title: "Add Route", href: "/dashboards/admin/route/add" },
          { title: "View Route List", href: "/dashboards/admin/route" },
          { title: "Add Planner", href: "/dashboards/admin/route/planner/add" },
          { title: "View Planner List", href: "/dashboards/admin/route/planner" },
        ],
      },

      { type: "link", title: "Scheme Management", href: "/dashboards/admin/schemes" },

      {
        type: "group",
        key: "purchase",
        title: "Purchase Management",
        children: [
          { title: "Purchase Challan", href: "/dashboards/admin/purchase/challan" },
          { title: "Purchase Order", href: "/dashboards/admin/purchase/order" },
          { title: "Purchase Invoice", href: "/dashboards/admin/purchase/invoice" },
          { title: "Purchase Return", href: "/dashboards/admin/purchase/return" },
          { title: "Stock Transfer", href: "/dashboards/admin/purchase/stock-transfer" },
          { title: "View Transfered Stock", href: "/dashboards/admin/purchase/transferred-stock" },
        ],
      },

      { type: "link", title: "Delivery Management", href: "/dashboards/admin/delivery" },

      {
        type: "group",
        key: "orders",
        title: "Orders Management",
        children: [
          { title: "Show Orders List", href: "/dashboards/admin/orders" },
          { title: "Secondary Orders List", href: "/dashboards/admin/orders/secondary" },
        ],
      },

      { type: "link", title: "User Live Tracking", href: "/dashboards/admin/live-tracking" },
      { type: "link", title: "Godown Summary", href: "/dashboards/admin/godown-summary" },
      { type: "link", title: "Sales Target", href: "/dashboards/admin/sales-target" },
      { type: "link", title: "Reports", href: "/dashboards/admin/reports" },
      { type: "link", title: "Settings", href: "/dashboards/admin/settings" },
      { type: "link", title: "API Integrations", href: "/dashboards/admin/integrations", badge: "Premium" },
    ],
    []
  );

  function go(href) {
    router.push(href);
    if (variant === "mobile" && onClose) onClose();
  }

  function logout() {
    localStorage.removeItem("aim_token");
    localStorage.removeItem("aim_role");
    localStorage.removeItem("aim_user");
    document.cookie = "aim_token=; Max-Age=0; path=/";
    document.cookie = "aim_role=; Max-Age=0; path=/";
    if (variant === "mobile" && onClose) onClose();
    router.push("/login");
  }

  return (
    <aside
      className={[
        "w-[280px] flex flex-col border-r bg-white min-h-screen",
        variant === "desktop" ? "hidden md:flex sticky top-0" : "flex",
      ].join(" ")}
    >
      <div className="px-4 py-4 border-b flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold">AH</span>
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-zinc-900">Admin</div>
            <div className="text-xs text-zinc-500">{user?.fullName || "System Admin"}</div>
          </div>
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

      <nav className="flex-1 overflow-auto px-2 py-3">
        {menu.map((item) => {
          if (item.type === "link") {
            const active = pathname === item.href;
            return (
              <button
                key={item.title}
                onClick={() => go(item.href)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm mb-1 ${
                  active ? "bg-emerald-50 text-emerald-700" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span>{item.title}</span>
                {item.badge ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          }

          const isOpen = !!open[item.key];
          return (
            <div key={item.title} className="mb-1">
              <button
                onClick={() => setOpen((s) => ({ ...s, [item.key]: !s[item.key] }))}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <span>{item.title}</span>
                <span className="text-zinc-400">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen ? (
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
                                  className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                                    pathname === cc.href
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "text-zinc-600 hover:bg-zinc-50"
                                  }`}
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
                        className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                          active ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50"
                        }`}
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

      <div className="p-3 border-t">
        <button onClick={logout} className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">
          Logout
        </button>
      </div>
    </aside>
  );
}
