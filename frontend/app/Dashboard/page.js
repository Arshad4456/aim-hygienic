"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../shared/Sidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cards, setCards] = useState([]);
  const [welcomeCompany, setWelcomeCompany] = useState("AIM Hygienics");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("aim_token");
    const u = localStorage.getItem("aim_user");
    if (!token || !u) router.push("/");
    else setUser(JSON.parse(u));
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const [m, d] = await Promise.all([
          fetch(`${API_BASE}/api/menu`).then(r => r.json()),
          fetch(`${API_BASE}/api/dashboard`).then(r => r.json())
        ]);
        setMenu(m?.menu || []);
        setCards(d?.dashboard?.cards || []);
        setWelcomeCompany(d?.dashboard?.welcomeCompany || "AIM Hygienics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = () => {
    localStorage.removeItem("aim_token");
    localStorage.removeItem("aim_user");
    router.push("/");
  };

  return (
    <div className="erpRoot">
      <Sidebar menu={menu} user={user} />

      <div className="erpMain">
        <div className="topBar">
          <div className="topBarLeft">
            <div className="brandLine">
              <span className="brandBold">Allied Tajar</span> <span className="brandSoft">(ERP)</span>
            </div>
          </div>

          <div className="topBarRight">
            <div className="chip">Invoice & Payment Alerts</div>
            <div className="chip">Quick Links</div>
            <div className="chip">Help & Training</div>
            <div className="chip danger">Due: 12600</div>
            <button className="logoutBtn" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="contentWrap">
          <div className="welcomeBox">
            <div className="welcomeTitle">Welcome</div>
            <div className="welcomeCompany">{welcomeCompany}</div>
            {user ? <div className="welcomeMeta">Logged in as: <b>{user.role}</b> | {user.fullName}</div> : null}
          </div>

          {loading ? (
            <div className="loading">Loading dashboard...</div>
          ) : (
            <div className="cardsGrid">
              {cards.map((c) => (
                <div className="kpiCard" key={c.key}>
                  <div className="kpiTitle">{c.title}</div>
                  <div className="kpiValue">{c.value}</div>
                  {c.sub ? <div className="kpiSub">{c.sub}</div> : <div className="kpiSub muted"> </div>}
                  {c.hint ? <div className="kpiHint">{c.hint}</div> : null}
                </div>
              ))}
            </div>
          )}

          <div className="sectionCard">
            <div className="sectionHead">
              <div className="sectionTitle">Monthly Salesman Evaluation</div>
              <div className="sectionActions">
                <button className="miniBtn">Evaluation</button>
                <button className="miniBtn">New Leads</button>
                <button className="miniBtn">Payment Reminders</button>
              </div>
            </div>

            <div className="filtersRow">
              <div className="filterItem">
                <div className="filterLabel">Distributor</div>
                <select className="select">
                  <option>All</option>
                </select>
              </div>
              <div className="filterItem">
                <div className="filterLabel">Start Date</div>
                <input className="inputSmall" defaultValue="01/01/2026" />
              </div>
              <div className="filterItem">
                <div className="filterLabel">End Date</div>
                <input className="inputSmall" defaultValue="31/01/2026" />
              </div>
              <button className="reloadBtn">Reload Stats</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
