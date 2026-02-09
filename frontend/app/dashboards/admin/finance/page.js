"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  {
    title: "Invoices",
    description: "Create and manage sales invoices and billing.",
    href: "/dashboards/admin/finance/invoices",
  },
  {
    title: "Receipts",
    description: "Record customer receipts and settlement status.",
    href: "/dashboards/admin/finance/receipts",
  },
  {
    title: "Aging Report",
    description: "Monitor outstanding receivables by aging bucket.",
    href: "/dashboards/admin/finance/aging",
  },
];

export default function FinanceModulePage() {
  const [report, setReport] = useState({ totals: {}, accounts: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/finance");
        setReport({
          totals: data.totals || {},
          accounts: data.accounts || [],
        });
      } catch (e) {
        setErr(e.message || "Failed to load finance report");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const totalBalance = report.accounts.reduce((sum, row) => sum + Number(row.currentBalance || 0), 0);
    return [
      { label: "Total Expenses", value: formatCurrency(report.totals.totalExpenses) },
      { label: "Approved Expenses", value: formatCurrency(report.totals.approvedExpenses) },
      { label: "Accounts Tracked", value: formatNumber(report.accounts.length) },
      { label: "Total Balances", value: formatCurrency(totalBalance) },
    ];
  }, [report]);

  return (
    <AdminShell title="Finance & Accounts" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Finance & Accounts</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track invoices, receipts, and profitability by product and warehouse.
        </div>
        <div className="text-xs text-emerald-600 mt-1">Auto-refreshing every 30 seconds</div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">{item.label}</div>
              <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow"
            >
              <div className="text-sm font-semibold text-zinc-900">{card.title}</div>
              <div className="text-xs text-zinc-500 mt-2">{card.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return `₨ ${Number(value).toLocaleString()}`;
}
