"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function OrderDispatchPage() {
  const [orders, setOrders] = useState([]);
  const [trackingById, setTrackingById] = useState({});
  const [err, setErr] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function loadDispatch() {
      setErr("");
      try {
        const data = await apiFetch("/orders/dispatch");
        setOrders(data.orders || []);
      } catch (e) {
        setErr(e.message || "Failed to load dispatch queue");
      }
    }
    loadDispatch();
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const payload = {
        status,
        dispatchTracking: trackingById[orderId] || undefined,
      };
      const data = await apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: payload });
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? data.order : order))
      );
      setTrackingById((prev) => ({ ...prev, [orderId]: "" }));
    } catch (e) {
      setErr(e.message || "Failed to update order");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminShell title="Pick & Dispatch" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Pick & Dispatch</div>
        <div className="text-sm text-zinc-500 mt-1">
          Allocate inventory, pick items, and dispatch deliveries with tracking.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Order No</th>
                <th className="text-left px-3 py-2 border-b">Customer</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Tracking</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                    <td className="px-3 py-2 border-b">{order.customerName}</td>
                    <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                    <td className="px-3 py-2 border-b">
                      <input
                        className="w-full rounded-lg border px-2 py-1 text-xs"
                        placeholder={order.dispatchTracking || "Tracking ID"}
                        value={trackingById[order._id] || ""}
                        onChange={(event) =>
                          setTrackingById((prev) => ({ ...prev, [order._id]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        {order.status === "approved" ? (
                          <button
                            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            onClick={() => updateStatus(order._id, "dispatched")}
                            disabled={updatingId === order._id}
                          >
                            Mark Dispatched
                          </button>
                        ) : (
                          <button
                            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            onClick={() => updateStatus(order._id, "completed")}
                            disabled={updatingId === order._id}
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No dispatch tasks yet.
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
