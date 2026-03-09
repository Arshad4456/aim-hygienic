"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function PurchaseOrdersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ supplierId: "", productName: "", quantity: 0, unitPrice: 0 });
  const [err, setErr] = useState("");

  const load = async () => {
    const [sData, oData] = await Promise.all([apiFetch("/procurement/suppliers"), apiFetch("/procurement/purchase-orders")]);
    setSuppliers(sData.suppliers || []);
    setOrders(oData.purchaseOrders || []);
  };

  useEffect(() => {
    async function initialLoad() {
      try {
        await load();
      } catch (e) {
        setErr(e.message);
      }
    }
    initialLoad();
  }, []);

  async function createPo(e) {
    e.preventDefault();
    setErr("");
    try {
      await apiFetch("/procurement/purchase-orders", {
        method: "POST",
        body: {
          supplierId: form.supplierId,
          items: [{ productName: form.productName, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }],
        },
      });
      setForm({ supplierId: "", productName: "", quantity: 0, unitPrice: 0 });
      await load();
    } catch (error) { setErr(error.message); }
  }

  return <AdminShell title="Purchase Orders" user={null}><div className="space-y-6">
    <form onSubmit={createPo} className="rounded-2xl border bg-white p-6 shadow-sm grid gap-3 md:grid-cols-2">
      {err ? <div className="text-red-600 text-sm md:col-span-2">{err}</div> : null}
      <select className="border rounded-lg px-3 py-2" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
        <option value="">Select supplier</option>
        {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
      <input className="border rounded-lg px-3 py-2" placeholder="Product name" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
      <input className="border rounded-lg px-3 py-2" type="number" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
      <input className="border rounded-lg px-3 py-2" type="number" placeholder="Unit Price" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
      <button className="rounded-lg bg-zinc-900 text-white px-4 py-2">Create PO</button>
    </form>

    <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr><th>PO #</th><th>Supplier</th><th>Status</th><th>Total</th><th>Date</th></tr></thead><tbody>{orders.map((o) => <tr key={o._id}><td>{o.poNumber}</td><td>{o.supplierName}</td><td>{o.status}</td><td>₨ {Number(o.totalAmount || 0).toLocaleString()}</td><td>{o.orderDate ? new Date(o.orderDate).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
  </div></AdminShell>;
}
