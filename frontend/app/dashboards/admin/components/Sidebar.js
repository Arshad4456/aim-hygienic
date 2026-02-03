// cat > app/dashboards/components/Sidebar.js <<'EOF'
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function Item({ label, icon, active, onClick, indent = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
        active ? "bg-emerald-50 text-emerald-700" : "text-zinc-700 hover:bg-zinc-100",
      ].join(" ")}
      style={{ paddingLeft: 12 + indent * 16 }}
    >
      <span className="w-5">{icon}</span>
      <span className="flex-1">{label}</span>
    </button>
  );
}

function Group({ label, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
      >
        <span className="w-5">{icon}</span>
        <span className="flex-1">{label}</span>
        <span className="text-xs text-zinc-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menu = useMemo(
    () => [
      { type: "item", label: "Dashboard", path: "/dashboards/admin", icon: "🖥️" },
      { type: "item", label: "Sales KPI", path: "/dashboards/admin/sales-kpi", icon: "📊" },

      {
        type: "group",
        label: "Products Management",
        icon: "🅿️",
        children: [
          { label: "Add New Product", path: "/dashboards/admin/products/add" },
          { label: "View Product List", path: "/dashboards/admin/products/list" },
          { label: "Product Barcode List", path: "/dashboards/admin/products/barcodes" },
          { label: "Price Change", path: "/dashboards/admin/products/price-change" },
        ],
      },

      {
        type: "group",
        label: "Expense Management",
        icon: "👤",
        children: [
          { label: "Add Expense", path: "/dashboards/admin/expenses/add" },
          { label: "View Expense List", path: "/dashboards/admin/expenses/list" },
        ],
      },

      { type: "item", label: "Account Management", path: "/dashboards/admin/accounts", icon: "👤" },

      {
        type: "group",
        label: "Customer Management",
        icon: "👤",
        children: [
          { label: "Add New Customer", path: "/dashboards/admin/customers/add" },
          { label: "View Customer List", path: "/dashboards/admin/customers/list" },
          { label: "User Credit Limit", path: "/dashboards/admin/customers/credit-limit" },
          { label: "Customer Coupon Policy", path: "/dashboards/admin/customers/coupon-policy" },
          { label: "Discount Policy", path: "/dashboards/admin/customers/discount-policy" },
        ],
      },

      {
        type: "group",
        label: "Supplier Management",
        icon: "🧑‍🤝‍🧑",
        children: [
          { label: "Add New Supplier", path: "/dashboards/admin/suppliers/add" },
          { label: "View Supplier List", path: "/dashboards/admin/suppliers/list" },
        ],
      },

      {
        type: "group",
        label: "Quality Control",
        icon: "☑️",
        children: [
          { label: "Raw Material QC", path: "/dashboards/admin/qc/raw-material" },
          { label: "Production QC", path: "/dashboards/admin/qc/production" },
          { label: "Finished Goods QC", path: "/dashboards/admin/qc/finished-goods" },
          { label: "Final Release QC", path: "/dashboards/admin/qc/final-release" },
        ],
      },

      { type: "item", label: "Finance/Accounts", path: "/dashboards/admin/finance", icon: "📁" },

      {
        type: "group",
        label: "Route Management",
        icon: "🧭",
        children: [
          { label: "Add Route", path: "/dashboards/admin/routes/add" },
          { label: "View Route List", path: "/dashboards/admin/routes/list" },
          { label: "Add Planner", path: "/dashboards/admin/routes/planner/add" },
          { label: "View Planner List", path: "/dashboards/admin/routes/planner/list" },
        ],
      },

      { type: "item", label: "Scheme Management", path: "/dashboards/admin/schemes", icon: "〰️" },

      {
        type: "group",
        label: "Purchase Management",
        icon: "🛒",
        children: [
          { label: "Purchase Challan", path: "/dashboards/admin/purchase/challan" },
          { label: "Purchase Order", path: "/dashboards/admin/purchase/order" },
          { label: "Purchase Invoice", path: "/dashboards/admin/purchase/invoice" },
          { label: "Purchase Return", path: "/dashboards/admin/purchase/return" },
          { label: "Stock Transfer", path: "/dashboards/admin/purchase/stock-transfer" },
          { label: "View Transferred Stock", path: "/dashboards/admin/purchase/transferred-stock" },
        ],
      },

      { type: "item", label: "Delivery Management", path: "/dashboards/admin/delivery", icon: "🚚" },

      {
        type: "group",
        label: "Orders Management",
        icon: "🚚",
        children: [
          { label: "Show Orders List", path: "/dashboards/admin/orders/list" },
          { label: "Secondary Orders List", path: "/dashboards/admin/orders/secondary" },
        ],
      },

      { type: "item", label: "User Live Tracking", path: "/dashboards/admin/tracking", icon: "📍" },
      { type: "item", label: "Godown Summary", path: "/dashboards/admin/godown", icon: "🏬" },
      { type: "item", label: "Sales Target", path: "/dashboards/admin/sales-target", icon: "📁" },
      { type: "item", label: "Reports", path: "/dashboards/admin/reports", icon: "📄" },
      { type: "item", label: "Settings", path: "/dashboards/admin/settings", icon: "⚙️" },
    ],
    []
  );

  return (
    <aside className="w-[280px] shrink-0 border-r bg-white min-h-screen">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 grid place-items-center font-bold text-emerald-700">
            M
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Admin</div>
            <div className="text-xs text-zinc-500">AIM Hygienic</div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-1">
        {menu.map((m, idx) => {
          if (m.type === "item") {
            return (
              <Item
                key={idx}
                label={m.label}
                icon={m.icon}
                active={pathname === m.path}
                onClick={() => router.push(m.path)}
              />
            );
          }

          return (
            <Group key={idx} label={m.label} icon={m.icon}>
              {m.children.map((c, j) => (
                <Item
                  key={j}
                  label={c.label}
                  icon="○"
                  indent={1}
                  active={pathname === c.path}
                  onClick={() => router.push(c.path)}
                />
              ))}
            </Group>
          );
        })}
      </div>
    </aside>
  );
}
// EOF
