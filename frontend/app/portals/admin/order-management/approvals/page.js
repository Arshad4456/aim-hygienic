"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function OrderApprovalsPage() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function loadApprovals() {
      setErr("");
      try {
        const data = await apiFetch("/orders/approvals");
        setOrders(data.orders || []);
      } catch (e) {
        setErr(e.message || "Failed to load approvals");
      }
    }
    loadApprovals();
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: { status } });
      setOrders((prev) => prev.filter((order) => order._id !== orderId));
    } catch (e) {
      setErr(e.message || "Failed to update order");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminShell title="Order Approvals" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Order Approvals</div>
        <div className="text-sm text-zinc-500 mt-1">
          Review orders for credit limits, pricing, and stock availability.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Order No</th>
                <th className="text-left px-3 py-2 border-b">Customer</th>
                <th className="text-left px-3 py-2 border-b">Order Value</th>
                <th className="text-left px-3 py-2 border-b">Order Date</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                    <td className="px-3 py-2 border-b">{order.customerName}</td>
                    <td className="px-3 py-2 border-b">₨ {formatNumber(order.totalAmount)}</td>
                    <td className="px-3 py-2 border-b">
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          onClick={() => updateStatus(order._id, "approved")}
                          disabled={updatingId === order._id}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded-full border px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
                          onClick={() => updateStatus(order._id, "rejected")}
                          disabled={updatingId === order._id}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Approval queue is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}