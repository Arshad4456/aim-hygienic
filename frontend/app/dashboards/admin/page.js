"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../components/AdminShell";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("aim_token");
    const role = localStorage.getItem("aim_role");
    const u = localStorage.getItem("aim_user");

    if (!token) {
      router.replace("/login");
      return;
    }
    if (role !== "admin") {
      router.replace("/login");
      return;
    }
    setUser(u ? JSON.parse(u) : null);
  }, [router]);

  const kpis = useMemo(() => {
    // These are UI demo KPIs for now. Next phase we will load real KPIs from API.
    return [
      { title: "Total Sales", value: "0 PKR", sub: "Last Month: 0.09 M" },
      { title: "Purchase", value: "0 PKR", sub: "Today: 0" },
      { title: "Stock Value", value: "0", sub: "Items: 0" },
      { title: "Total Invoices", value: "0", sub: "Month: 0" },
    ];
  }, []);

  return (
    <AdminShell user={user}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-white border shadow-sm p-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-500">Welcome</div>
            <div className="text-2xl font-semibold text-zinc-900">
              {user?.company || "AIM Hygienic (Pvt) Limited"}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              Logged in as <span className="font-medium text-zinc-800">{user?.fullName || "Admin"}</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold">AH</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.title} className="rounded-2xl bg-white border shadow-sm p-4">
              <div className="text-sm text-zinc-500">{k.title}</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">{k.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="text-lg font-semibold text-zinc-900 mb-4">Monthly Salesman Evaluation</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <select className="rounded-xl border px-3 py-2 bg-white">
              <option>Distributor: All</option>
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="Start Date (dd/mm/yyyy)" />
            <input className="rounded-xl border px-3 py-2" placeholder="End Date (dd/mm/yyyy)" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MiniStat label="Total Invoices" value="0 = 0.00 PKR" />
            <MiniStat label="Salesman" value="0" />
            <MiniStat label="Target" value="0" />
            <MiniStat label="Sale" value="0" />
          </div>

          <div className="overflow-auto rounded-xl border">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Sr#</th>
                  <th className="text-left px-3 py-2 border-b">Description</th>
                  <th className="text-left px-3 py-2 border-b">Invoices</th>
                  <th className="text-left px-3 py-2 border-b">Sale (PKR)</th>
                  <th className="text-left px-3 py-2 border-b">Recovery (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border-b">1</td>
                  <td className="px-3 py-2 border-b">Rawalpindi</td>
                  <td className="px-3 py-2 border-b">0</td>
                  <td className="px-3 py-2 border-b">0</td>
                  <td className="px-3 py-2 border-b">0</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">2</td>
                  <td className="px-3 py-2">Islamabad</td>
                  <td className="px-3 py-2">0</td>
                  <td className="px-3 py-2">0</td>
                  <td className="px-3 py-2">0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-zinc-900 mt-1">{value}</div>
    </div>
  );
}
