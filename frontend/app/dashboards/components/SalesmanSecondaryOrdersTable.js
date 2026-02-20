"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SalesmanSecondaryOrdersTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch("/orders/my?limit=200");
        if (!active) return;
        setRows(data.orders || []);
      } catch (error) {
        if (!active) return;
        setErr(error?.message || "Failed to load secondary orders");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const approvedSecondaryOrders = useMemo(
    () =>
      rows
        .filter((order) => order.saleType === "secondary" && ["approved", "dispatched", "delivered"].includes(order.status))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [rows]
  );

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold text-zinc-900">Approved Secondary Orders</div>
      <div className="mt-1 text-sm text-zinc-500">Showing approved secondary orders mapped to your territory and field.</div>

      {err ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 overflow-auto rounded-xl border">
        <table className="min-w-[780px] w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="border-b px-3 py-2 text-left">Order #</th>
              <th className="border-b px-3 py-2 text-left">Customer</th>
              <th className="border-b px-3 py-2 text-left">Territory</th>
              <th className="border-b px-3 py-2 text-left">Field</th>
              <th className="border-b px-3 py-2 text-left">Status</th>
              <th className="border-b px-3 py-2 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {approvedSecondaryOrders.map((order) => (
              <tr key={order._id} className="hover:bg-zinc-50">
                <td className="border-b px-3 py-2">{order.orderNo}</td>
                <td className="border-b px-3 py-2">{order.customerName || "-"}</td>
                <td className="border-b px-3 py-2">{order.territoryName || "-"}</td>
                <td className="border-b px-3 py-2">{order.fieldName || order.fieldId || "-"}</td>
                <td className="border-b px-3 py-2 capitalize">{order.status}</td>
                <td className="border-b px-3 py-2">₨ {Number(order.totalAmount || 0).toLocaleString()}</td>
              </tr>
            ))}
            {!approvedSecondaryOrders.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  {loading ? "Loading..." : "No approved secondary orders for your territory/field."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
