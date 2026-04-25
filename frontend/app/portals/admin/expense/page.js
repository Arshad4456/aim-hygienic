"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const sections = [
  { key: "all", label: "All" },
  { key: "personal", label: "Personal" },
  { key: "daily", label: "Daily" },
  { key: "distributor", label: "Distributor" },
];

export default function ExpenseOverviewPage() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ section: "all", status: "all", paymentMethod: "all" });

  useEffect(() => {
    apiFetch("/expenses").then((d) => setRows(d.expenses || [])).catch(() => setRows([]));
  }, []);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => {
      const d = new Date(r.expenseDate || r.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [rows]);

  const filtered = useMemo(() => currentMonth.filter((r) => {
    if (filters.section !== "all" && r.section !== filters.section) return false;
    if (filters.status !== "all" && r.status !== filters.status) return false;
    if (filters.paymentMethod !== "all" && r.paymentMethod !== filters.paymentMethod) return false;
    return true;
  }), [currentMonth, filters]);

  const total = filtered.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const cashTotal = filtered.filter((r) => r.paymentMethod === "cash").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const onlineTotal = filtered.filter((r) => r.paymentMethod === "online").reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const pendingCount = filtered.filter((r) => r.status === "pending").length;

  const categorySummary = Object.entries(filtered.reduce((acc, row) => {
    const key = row.category || "Uncategorized";
    acc[key] = (acc[key] || 0) + Number(row.amount || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  const topCategory = categorySummary[0]?.[0] || "-";
  const biggestExpense = filtered.slice().sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

  return (
    <AdminShell title="Expense Management" user={null}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">Expense Management · Module Overview</h1>
              <p className="mt-1 text-sm text-zinc-500">Executive dashboard for personal, daily, and distributor expenses with approvals and account impact.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link className="rounded-lg border px-3 py-2 hover:bg-zinc-50" href="/portals/admin/expense/personal">AIM – Personal Expense</Link>
              <Link className="rounded-lg border px-3 py-2 hover:bg-zinc-50" href="/portals/admin/expense/daily">Daily Expense</Link>
              <Link className="rounded-lg border px-3 py-2 hover:bg-zinc-50" href="/portals/admin/expense/distributor">Distributor Expense</Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select label="Section" value={filters.section} onChange={(section) => setFilters((s) => ({ ...s, section }))} options={sections} />
            <Select label="Status" value={filters.status} onChange={(status) => setFilters((s) => ({ ...s, status }))} options={[{ key: "all", label: "All" }, { key: "approved", label: "Approved" }, { key: "pending", label: "Pending" }, { key: "rejected", label: "Rejected" }]} />
            <Select label="Payment Method" value={filters.paymentMethod} onChange={(paymentMethod) => setFilters((s) => ({ ...s, paymentMethod }))} options={[{ key: "all", label: "All" }, { key: "cash", label: "Cash" }, { key: "online", label: "Online" }, { key: "cheque", label: "Cheque" }]} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card title="Total Expenses (MTD)" value={money(total)} />
          <Card title="Cash Expenses (MTD)" value={money(cashTotal)} />
          <Card title="Online Expenses (MTD)" value={money(onlineTotal)} />
          <Card title="Pending Approvals" value={String(pendingCount)} />
          <Card title="Top Category" value={topCategory} />
          <Card title="Biggest Single Expense" value={biggestExpense ? `${money(biggestExpense.amount)} (${biggestExpense.category || "N/A"})` : "-"} />
          <Card title="Expense Growth vs Last Month" value={growthText(rows)} />
          <Card title="Accounting Impact" value="Auto cash-out posting on approval" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold text-zinc-900">Top Categories (Current Month)</h3>
            <div className="mt-3 space-y-2">
              {categorySummary.slice(0, 10).map(([name, amount]) => (
                <Bar key={name} label={name} value={amount} max={categorySummary[0]?.[1] || 1} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-semibold text-zinc-900">Automated Insights</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
              <li>{topCategory === "-" ? "No category trend available yet." : `${topCategory} is the highest contributor this month.`}</li>
              <li>{`Top 5 users spending this month: ${topUsers(filtered) || "No data"}.`}</li>
              <li>{`Cash burn rate (avg/day): ${money(total / Math.max(new Date().getDate(), 1))}.`}</li>
              <li>Upcoming recurring expenses to track: rent, utilities, salaries, and support reimbursements.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Card({ title, value }) {
  return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{title}</div><div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div></div>;
}

function Select({ label, value, onChange, options }) {
  return <div><div className="text-sm font-medium text-zinc-800">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select></div>;
}

function money(v) { return `PKR ${Number(v || 0).toLocaleString()}`; }

function growthText(rows) {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  const cur = rows.filter((r) => { const d = new Date(r.expenseDate || r.createdAt); return d.getMonth() === m && d.getFullYear() === y; }).reduce((s, r) => s + Number(r.amount || 0), 0);
  const prev = rows.filter((r) => { const d = new Date(r.expenseDate || r.createdAt); return d.getMonth() === prevM && d.getFullYear() === prevY; }).reduce((s, r) => s + Number(r.amount || 0), 0);
  if (!prev) return "New baseline";
  return `${(((cur - prev) / prev) * 100).toFixed(1)}%`;
}

function topUsers(rows) {
  const m = {};
  rows.forEach((r) => { const k = r.spenderName || r.requestedBy || "Unknown"; m[k] = (m[k] || 0) + Number(r.amount || 0); });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k).join(", ");
}

function Bar({ label, value, max }) {
  const width = Math.max(8, Math.round((value / max) * 100));
  return <div><div className="mb-1 flex items-center justify-between text-xs"><span className="text-zinc-700">{label}</span><span className="font-medium">{money(value)}</span></div><div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${width}%` }} /></div></div>;
}