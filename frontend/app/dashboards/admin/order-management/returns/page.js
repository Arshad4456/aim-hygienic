"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function OrderReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [err, setErr] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    orderNo: "",
    customerName: "",
    reason: "",
    quantity: "",
    notes: "",
  });
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    async function loadReturns() {
      setErr("");
      try {
        const data = await apiFetch("/returns");
        setReturns(data.returns || []);
      } catch (e) {
        setErr(e.message || "Failed to load returns");
      }
    }
    loadReturns();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    try {
      const payload = {
        orderNo: form.orderNo,
        customerName: form.customerName,
        reason: form.reason,
        quantity: form.quantity || undefined,
        notes: form.notes || undefined,
      };
      const data = await apiFetch("/returns", { method: "POST", body: payload });
      setReturns((prev) => [data.claim, ...prev]);
      setForm({ orderNo: "", customerName: "", reason: "", quantity: "", notes: "" });
    } catch (e) {
      setSubmitError(e.message || "Failed to create return claim");
    }
  };

  const updateStatus = async (claimId, status) => {
    setUpdatingId(claimId);
    try {
      const data = await apiFetch(`/returns/${claimId}/status`, { method: "PATCH", body: { status } });
      setReturns((prev) => prev.map((item) => (item._id === claimId ? data.claim : item)));
    } catch (e) {
      setErr(e.message || "Failed to update return claim");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <AdminShell title="Returns & Claims" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Returns & Claims</div>
          <div className="text-sm text-zinc-500 mt-1">
            Track returns, claims, replacements, and credit notes for sales orders.
          </div>

          {submitError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Order No</label>
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.orderNo}
                onChange={(event) => setForm((prev) => ({ ...prev, orderNo: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Customer Name</label>
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.customerName}
                onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-zinc-600">Reason</label>
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.reason}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Quantity</label>
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Notes</label>
              <input
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Submit Return
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Return Requests</div>
          <div className="text-sm text-zinc-500 mt-1">
            Review and resolve return claims from distributors and customers.
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Order No</th>
                  <th className="text-left px-3 py-2 border-b">Customer</th>
                  <th className="text-left px-3 py-2 border-b">Reason</th>
                  <th className="text-left px-3 py-2 border-b">Qty</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.length ? (
                  returns.map((claim) => (
                    <tr key={claim._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">{claim.orderNo}</td>
                      <td className="px-3 py-2 border-b">{claim.customerName}</td>
                      <td className="px-3 py-2 border-b">{claim.reason}</td>
                      <td className="px-3 py-2 border-b">{claim.quantity || "—"}</td>
                      <td className="px-3 py-2 border-b capitalize">{claim.status}</td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex flex-wrap gap-2">
                          {claim.status === "requested" ? (
                            <>
                              <button
                                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                onClick={() => updateStatus(claim._id, "approved")}
                                disabled={updatingId === claim._id}
                              >
                                Approve
                              </button>
                              <button
                                className="rounded-full border px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
                                onClick={() => updateStatus(claim._id, "rejected")}
                                disabled={updatingId === claim._id}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                              onClick={() => updateStatus(claim._id, "resolved")}
                              disabled={updatingId === claim._id}
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                      No return requests yet.
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
