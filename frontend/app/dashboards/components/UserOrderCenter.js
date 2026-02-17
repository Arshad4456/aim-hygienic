"use client";

import { useEffect, useMemo, useState } from "react";
import UserDashboardShell from "./userDashboardShell";
import { apiFetch } from "../../lib/api";

export default function UserOrderCenter({ title, roleKey, links, canConfirmReceipt, canUploadProof }) {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [proofById, setProofById] = useState({});

  async function loadOrders() {
    const data = await apiFetch("/orders/my");
    return data.orders || [];
  }

  useEffect(() => {
    let active = true;
    (async () => {
      setErr("");
      try {
        const next = await loadOrders();
        if (active) setOrders(next);
      } catch (e) {
        if (active) setErr(e.message || "Failed to load orders");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const unreadCount = useMemo(() => {
    return orders.filter((order) => order.status === "pending" || order.status === "approved").length;
  }, [orders]);

  const setAgreement = async (orderId, agreement) => {
    try {
      await apiFetch(`/orders/${orderId}/receipt-agreement`, { method: "PATCH", body: { agreement } });
      const next = await loadOrders();
      setOrders(next);
    } catch (e) {
      setErr(e.message || "Failed to update receipt");
    }
  };

  const uploadProof = async (orderId) => {
    try {
      await apiFetch(`/orders/${orderId}/proof-of-delivery`, {
        method: "PATCH",
        body: { proofOfDeliveryImageUrl: proofById[orderId] || "camera-upload.jpg" },
      });
      const next = await loadOrders();
      setOrders(next);
    } catch (e) {
      setErr(e.message || "Failed to upload proof");
    }
  };

  return (
    <UserDashboardShell
      title={title}
      subtitle="Track request orders with unread indicators, receipt flow, and delivery states."
      roleKey={roleKey}
      links={links}
      showAccountCards
    >
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-zinc-900">Order Requests</div>
          <div className="text-xs rounded-full bg-amber-100 text-amber-700 px-3 py-1">Unread/active: {unreadCount}</div>
        </div>
        {err ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}

        <div className="mt-4 overflow-auto rounded-xl border">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Order</th>
                <th className="text-left px-3 py-2 border-b">Sale</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Receipt</th>
                <th className="text-left px-3 py-2 border-b">Proof of Delivery</th>
                <th className="text-left px-3 py-2 border-b">Preview</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b">{order.orderNo}</td>
                  <td className="px-3 py-2 border-b capitalize">{order.saleType}</td>
                  <td className={`px-3 py-2 border-b capitalize ${order.status === "rejected" ? "text-red-600" : order.status === "delivered" ? "text-emerald-600" : ""}`}>
                    {order.status}
                  </td>
                  <td className={`px-3 py-2 border-b ${order.receiptAgreement === "agreed" ? "text-emerald-600" : order.receiptAgreement === "not_agreed" ? "text-red-600" : ""}`}>
                    {order.receiptAgreement}
                    {canConfirmReceipt && order.status === "approved" ? (
                      <div className="mt-2 flex gap-2">
                        <button className="rounded-full bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => setAgreement(order._id, "agreed")}>Agree</button>
                        <button className="rounded-full bg-red-600 px-2 py-1 text-xs text-white" onClick={() => setAgreement(order._id, "not_agreed")}>Not Agree</button>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 border-b">
                    {order.proofOfDeliveryImageUrl ? (
                      <span className="text-emerald-700">Uploaded</span>
                    ) : canUploadProof ? (
                      <div className="space-y-2">
                        <input className="w-full rounded border px-2 py-1 text-xs" placeholder="proof-image.jpg" value={proofById[order._id] || ""} onChange={(e) => setProofById((prev) => ({ ...prev, [order._id]: e.target.value }))} />
                        <button className="rounded-full bg-blue-600 px-2 py-1 text-xs text-white" onClick={() => uploadProof(order._id)}>Proof of Delivery</button>
                      </div>
                    ) : (
                      "Pending"
                    )}
                  </td>
                  <td className="px-3 py-2 border-b text-xs text-zinc-500">{order.customerName} / ₨ {Number(order.totalAmount || 0).toLocaleString()}</td>
                </tr>
              ))}
              {!orders.length ? (
                <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={6}>No relevant orders yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </UserDashboardShell>
  );
}
