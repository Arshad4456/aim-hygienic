"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function iconFor(name) {
  // Simple icons (no dependencies)
  const map = {
    dashboard: "🖥️",
    kpi: "📊",
    products: "🧾",
    expense: "💸",
    account: "👤",
    customers: "👥",
    supplier: "🏭",
    qc: "✅",
    finance: "💼",
    route: "🧭",
    scheme: "〽️",
    purchase: "🛒",
    delivery: "🚚",
    orders: "📦",
    tracking: "📍",
    godown: "🏬",
    targets: "🎯",
    reports: "📄",
    settings: "⚙️",
    plug: "🔌"
  };
  return map[name] || "•";
}

export default function Sidebar({ menu = [], user }) {
  const pathname = usePathname();
  const [open, setOpen] = useState({}); // open groups

  const headerName = useMemo(() => {
    return user?.role === "ADMIN" ? "Admin" : (user?.role || "User");
  }, [user]);

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  return (
    <aside className="sidebar">
      <div className="sidebarTop">
        <div className="logoWrap">
          <div className="logoCircleSmall">m</div>
          <div className="sideTitle">
            <div className="sideBrand">Mamia</div>
            <div className="sideSub">{headerName}</div>
          </div>
        </div>
      </div>

      <nav className="menu">
        {menu.map((item, idx) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0;
          const key = `${item.title}-${idx}`;
          const isOpen = !!open[key];

          if (!hasChildren) {
            const active = pathname === item.path;
            return (
              <Link key={key} href={item.path || "#"} className={`menuItem ${active ? "active" : ""}`}>
                <span className="mIcon">{iconFor(item.icon)}</span>
                <span className="mText">{item.title}</span>
                {item.badge ? <span className="badge">{item.badge}</span> : null}
              </Link>
            );
          }

          return (
            <div key={key} className="menuGroup">
              <button className="menuItem groupBtn" onClick={() => toggle(key)} type="button">
                <span className="mIcon">{iconFor(item.icon)}</span>
                <span className="mText">{item.title}</span>
                <span className="chev">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen ? (
                <div className="submenu">
                  {item.children.map((c, j) => {
                    const subKey = `${key}-${j}`;
                    const subHasChildren = Array.isArray(c.children) && c.children.length > 0;

                    if (!subHasChildren) {
                      const active = pathname === c.path;
                      return (
                        <Link key={subKey} href={c.path || "#"} className={`subItem ${active ? "active" : ""}`}>
                          <span className="bullet">◦</span>
                          <span>{c.title}</span>
                        </Link>
                      );
                    }

                    // nested group (like Discount Policy)
                    const nestedKey = `${subKey}-nested`;
                    const nestedOpen = !!open[nestedKey];

                    return (
                      <div key={subKey} className="nestedGroup">
                        <button className="subItem nestedBtn" type="button" onClick={() => toggle(nestedKey)}>
                          <span className="bullet">◦</span>
                          <span>{c.title}</span>
                          <span className="chev">{nestedOpen ? "▾" : "▸"}</span>
                        </button>

                        {nestedOpen ? (
                          <div className="nestedSub">
                            {c.children.map((n, k) => {
                              const active = pathname === n.path;
                              return (
                                <Link key={`${subKey}-${k}`} href={n.path || "#"} className={`subItem deep ${active ? "active" : ""}`}>
                                  <span className="bullet">•</span>
                                  <span>{n.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="sidebarBottom">
        <div className="supportBubble">💬</div>
      </div>
    </aside>
  );
}
