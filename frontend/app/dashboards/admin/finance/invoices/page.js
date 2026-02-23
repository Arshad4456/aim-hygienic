"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

export default function FinanceInvoicesPage() {
  const now = useNow();
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    apiFetch("/orders?limit=200")
      .then((data) => {
        if (ignore) return;
        setOrders(data.orders || []);
      })
      .catch((e) => {
        if (ignore) return;
        setErr(e.message || "Failed to load invoices");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const deliveredInvoices = useMemo(
    () => orders.filter((o) => String(o.status || "").toLowerCase() === "delivered"),
    [orders]
  );

  return (
    <AdminShell title="Invoices" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Invoices</div>
            <div className="text-sm text-zinc-500 mt-1">All delivered sales invoices from order management.</div>
          </div>
          <div className="rounded-full border bg-zinc-50 px-3 py-1 text-xs text-zinc-600">{now.toLocaleString()}</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard label="Delivered Invoices" value={String(deliveredInvoices.length)} />
          <StatCard label="Total Delivered Amount" value={`PKR ${deliveredInvoices.reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString()}`} />
          <StatCard label="Latest Delivered" value={deliveredInvoices[0]?.createdAt ? new Date(deliveredInvoices[0].createdAt).toLocaleDateString() : "-"} />
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {["Invoice/Order #", "Sale Type", "Distributor", "Territory", "Total Amount", "Delivered Date", "Status"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Loading delivered invoices...</td></tr>
              ) : deliveredInvoices.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No delivered invoices found.</td></tr>
              ) : (
                deliveredInvoices.map((o) => (
                  <tr key={o._id}>
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{o.orderNo || o.invoiceNo || o._id}</td>
                    <td className="px-3 py-2 border-b">{o.saleType || "-"}</td>
                    <td className="px-3 py-2 border-b">{o.distributorName || o.customerName || o.distributorId || "-"}</td>
                    <td className="px-3 py-2 border-b">{o.territoryName || o.areaName || "-"}</td>
                    <td className="px-3 py-2 border-b">PKR {Number(o.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 border-b">{o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2 border-b"><span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">Delivered</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }) {
  return <div className="rounded-xl border p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div></div>;
}