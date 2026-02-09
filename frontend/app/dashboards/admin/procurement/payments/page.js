"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/expenses");
        const expenseRows = data.expenses || [];
        const supplierExpenses = expenseRows.filter((row) => row.vendorName);
        setPayments(supplierExpenses);
      } catch (e) {
        setErr(e.message || "Failed to load supplier payments");
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const totalPaid = payments
      .filter((row) => ["approved", "paid"].includes(String(row.status || "").toLowerCase()))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pendingCount = payments.filter((row) => String(row.status || "").toLowerCase() === "pending").length;
    return [
      { label: "Supplier Payments", value: formatNumber(payments.length) },
      { label: "Pending Payments", value: formatNumber(pendingCount) },
      { label: "Paid/Approved Amount", value: formatCurrency(totalPaid) },
    ];
  }, [payments]);

  return (
    <AdminShell title="Supplier Payments" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold text-zinc-900">Supplier Payments</div>
              <div className="text-sm text-zinc-500 mt-1">
                Track supplier invoices, due dates, and payment status in real time.
              </div>
            </div>
            <div className="text-xs text-emerald-600">Auto-refreshing every 30 seconds</div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((item) => (
              <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
                <div className="text-xs text-zinc-500">{item.label}</div>
                <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Payment Ledger</div>
          <div className="text-sm text-zinc-500 mt-1">
            Supplier expenses with payment mode, references, and status.
          </div>
          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Supplier</th>
                  <th className="text-left px-3 py-2 border-b">Category</th>
                  <th className="text-left px-3 py-2 border-b">Amount</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Mode</th>
                  <th className="text-left px-3 py-2 border-b">Reference</th>
                  <th className="text-left px-3 py-2 border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.length ? (
                  payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">
                        {payment.vendorName}
                      </td>
                      <td className="px-3 py-2 border-b">{payment.category || "—"}</td>
                      <td className="px-3 py-2 border-b">{formatCurrency(payment.amount)}</td>
                      <td className="px-3 py-2 border-b capitalize">{payment.status || "—"}</td>
                      <td className="px-3 py-2 border-b capitalize">{payment.paymentMode || "—"}</td>
                      <td className="px-3 py-2 border-b">{payment.paymentReference || "—"}</td>
                      <td className="px-3 py-2 border-b">
                        {payment.expenseDate ? new Date(payment.expenseDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                      No supplier payment records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
