"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function FinanceReportPage() {
  const [report, setReport] = useState({ totals: {}, expensesByCategory: [], accounts: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/finance");
        setReport({
          totals: data.totals || {},
          expensesByCategory: data.expensesByCategory || [],
          accounts: data.accounts || [],
        });
      } catch (e) {
        setErr(e.message || "Failed to load finance report");
      }
    }
    load();
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
    <AdminShell title="Finance Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Finance & Expenses</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track budget utilization, approvals, and cash position.
        </div>

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

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Category</th>
                <th className="text-left px-3 py-2 border-b">Expense Count</th>
                <th className="text-left px-3 py-2 border-b">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {report.expensesByCategory.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-zinc-500">
                    No expenses recorded
                  </td>
                </tr>
              ) : (
                report.expensesByCategory.map((row) => (
                  <tr key={row.category} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.category}</td>
                    <td className="px-3 py-2 border-b">{formatNumber(row.count)}</td>
                    <td className="px-3 py-2 border-b">{formatCurrency(row.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Account Balances</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {report.accounts.length === 0 ? (
              <div className="rounded-xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                No accounts configured.
              </div>
            ) : (
              report.accounts.map((account) => (
                <div key={account.accountName} className="rounded-xl border bg-white px-4 py-3">
                  <div className="text-sm font-semibold text-zinc-900">{account.accountName}</div>
                  <div className="text-xs text-zinc-500 mt-1 capitalize">{account.accountType}</div>
                  <div className="text-lg font-semibold text-zinc-900 mt-2">
                    {account.currency || "BDT"} {formatNumber(account.currentBalance)}
                  </div>
                </div>
              ))
            )}
          </div>
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