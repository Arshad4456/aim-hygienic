"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SalesmanDeliveriesModule() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingFor, setUploadingFor] = useState("");
  const [dispatchingFor, setDispatchingFor] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/orders/salesman-deliveries?limit=500");
      setOrders(res?.orders || []);
    } catch (e) {
      setError(e.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function dispatchOrder(orderId) {
    setDispatchingFor(orderId);
    setError("");
    try {
      await apiFetch(`/orders/${orderId}/status`, { method: "PATCH", body: { status: "dispatched" } });
      await loadOrders();
    } catch (e) {
      setError(e.message || "Failed to dispatch order");
    } finally {
      setDispatchingFor("");
    }
  }

  async function uploadPod(orderId, file) {
    if (!file) return;
    setUploadingFor(orderId);
    setError("");
    try {
      const presigned = await apiFetch("/uploads/pod-url", {
        method: "POST",
        body: { orderId, contentType: file.type || "image/jpeg" },
      });

      const putRes = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Cloud upload failed (${putRes.status})`);
      }

      await apiFetch(`/orders/${orderId}/pod`, {
        method: "POST",
        body: { objectKey: presigned.objectKey, publicUrl: presigned.publicUrl },
      });

      await loadOrders();
    } catch (e) {
      setError(e.message || "Failed to upload POD");
    } finally {
      setUploadingFor("");
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Deliveries</h3>
          <p className="text-xs text-zinc-500">Secondary orders in Approved / Dispatched state for your field.</p>
        </div>
      </div>

      {error ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="mt-4 overflow-auto rounded-xl border">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left px-3 py-2 border-b">Order / Invoice</th>
              <th className="text-left px-3 py-2 border-b">Customer / Business</th>
              <th className="text-left px-3 py-2 border-b">Address</th>
              <th className="text-left px-3 py-2 border-b">Distributor</th>
              <th className="text-left px-3 py-2 border-b">Field</th>
              <th className="text-left px-3 py-2 border-b">Status</th>
              <th className="text-left px-3 py-2 border-b">POD Status</th>
              <th className="text-left px-3 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isApproved = order.status === "approved";
              const isDispatched = order.status === "dispatched";
              return (
                <tr key={order._id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b">{order.orderNo || "-"}<div className="text-xs text-zinc-500">{order.invoiceNo || "-"}</div></td>
                  <td className="px-3 py-2 border-b">{order.customerName || order.businessName || "-"}</td>
                  <td className="px-3 py-2 border-b">{order.address || "-"}</td>
                  <td className="px-3 py-2 border-b">{order.distributorName || order.toWarehouseName || "-"}</td>
                  <td className="px-3 py-2 border-b">{order.fieldName || "-"}</td>
                  <td className="px-3 py-2 border-b uppercase">{order.status}</td>
                  <td className="px-3 py-2 border-b">
                    {order.podUrl ? (
                      <span className="text-emerald-700">Uploaded</span>
                    ) : isDispatched ? (
                      <label className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white cursor-pointer inline-block">
                        {uploadingFor === order._id ? "Uploading..." : "Upload POD"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={uploadingFor === order._id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            uploadPod(order._id, file);
                          }}
                        />
                      </label>
                    ) : (
                      <span className="text-amber-700">Not Uploaded (Dispatch first)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border-b">
                    <div className="flex flex-wrap gap-2 items-center">
                      {isApproved ? (
                        <button className="rounded-full bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50" disabled={dispatchingFor === order._id} onClick={() => dispatchOrder(order._id)}>
                          {dispatchingFor === order._id ? "Dispatching..." : "Dispatch"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!orders.length ? (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500" colSpan={8}>{loading ? "Loading deliveries..." : "No deliveries found for your field."}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
