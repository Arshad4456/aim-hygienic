"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const emptyItem = { productName: "", productCode: "", quantity: 1, unitPrice: 0 };

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    customerType: "customer",
    orderNo: "",
    expectedDelivery: "",
    notes: "",
    items: [{ ...emptyItem }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      setErr("");
      try {
        const data = await apiFetch("/orders");
        setOrders(data.orders || []);
      } catch (e) {
        setErr(e.message || "Failed to load orders");
      }
    }
    loadOrders();
  }, []);

  const totalAmount = useMemo(() => {
    return form.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0,
    );
  }, [form.items]);

  const handleItemChange = (index, key, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const items = prev.items.filter((_, idx) => idx !== index);
      return { ...prev, items: items.length ? items : [{ ...emptyItem }] };
    });
  };

  const resetForm = () => {
    setForm({
      customerName: "",
      customerType: "customer",
      orderNo: "",
      expectedDelivery: "",
      notes: "",
      items: [{ ...emptyItem }],
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        customerName: form.customerName,
        customerType: form.customerType,
        orderNo: form.orderNo || undefined,
        expectedDelivery: form.expectedDelivery || undefined,
        notes: form.notes || undefined,
        items: form.items,
      };
      const data = await apiFetch("/orders", { method: "POST", body: payload });
      setOrders((prev) => [data.order, ...prev]);
      resetForm();
    } catch (e) {
      setSubmitError(e.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell title="Sales Orders" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Create Sales Order</div>
          <div className="text-sm text-zinc-500 mt-1">
            Create and track sales orders submitted by customers, distributors, or sales teams.
          </div>

          {submitError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-600">Customer Name</label>
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.customerName}
                  onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                  placeholder="ABC Trading"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600">Customer Type</label>
                <select
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.customerType}
                  onChange={(event) => setForm((prev) => ({ ...prev, customerType: event.target.value }))}
                >
                  <option value="customer">Customer</option>
                  <option value="distributor">Distributor</option>
                  <option value="salesman">Salesman</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600">Order No (optional)</label>
                <input
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.orderNo}
                  onChange={(event) => setForm((prev) => ({ ...prev, orderNo: event.target.value }))}
                  placeholder="SO-000123"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600">Expected Delivery</label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.expectedDelivery}
                  onChange={(event) => setForm((prev) => ({ ...prev, expectedDelivery: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-900">Order Items</div>
                <button
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-white"
                  onClick={addItem}
                >
                  Add Item
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-5">
                    <div className="md:col-span-2">
                      <label className="text-xs text-zinc-500">Product Name</label>
                      <input
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                        value={item.productName}
                        onChange={(event) => handleItemChange(index, "productName", event.target.value)}
                        placeholder="Handwash 250ml"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Product Code</label>
                      <input
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                        value={item.productCode}
                        onChange={(event) => handleItemChange(index, "productCode", event.target.value)}
                        placeholder="SKU-101"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Qty</label>
                      <input
                        type="number"
                        min="1"
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                        value={item.quantity}
                        onChange={(event) => handleItemChange(index, "quantity", event.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
                        value={item.unitPrice}
                        onChange={(event) => handleItemChange(index, "unitPrice", event.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="w-full rounded-lg border px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm font-semibold text-zinc-900">
                <span>Total Amount</span>
                <span>৳ {formatNumber(totalAmount)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-600">Notes</label>
              <textarea
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Special delivery instructions or remarks"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-full border px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                onClick={resetForm}
              >
                Reset
              </button>
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Order"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-zinc-900">Sales Order List</div>
              <div className="text-sm text-zinc-500 mt-1">Track order status and totals.</div>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[860px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Order No</th>
                  <th className="text-left px-3 py-2 border-b">Customer</th>
                  <th className="text-left px-3 py-2 border-b">Type</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Total</th>
                  <th className="text-left px-3 py-2 border-b">Order Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length ? (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b font-medium text-zinc-900">{order.orderNo}</td>
                      <td className="px-3 py-2 border-b">{order.customerName}</td>
                      <td className="px-3 py-2 border-b capitalize">{order.customerType}</td>
                      <td className="px-3 py-2 border-b capitalize">{order.status}</td>
                      <td className="px-3 py-2 border-b">৳ {formatNumber(order.totalAmount)}</td>
                      <td className="px-3 py-2 border-b">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                      No orders yet. Create your first sales order above.
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