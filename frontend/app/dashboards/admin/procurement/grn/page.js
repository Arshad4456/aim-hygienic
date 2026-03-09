"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function GrnPage() {
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [form, setForm] = useState({ purchaseOrderId: "", warehouseId: "MAIN", warehouseName: "Main Warehouse", quantityReceived: 0 });
  const [err, setErr] = useState("");

  const load = async () => {
    const [oData, rData] = await Promise.all([apiFetch("/procurement/purchase-orders"), apiFetch("/procurement/grn")]);
    setOrders(oData.purchaseOrders || []);
    setReceipts(rData.receipts || []);
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

  async function createGrn(e) {
    e.preventDefault();
    const po = orders.find((row) => row._id === form.purchaseOrderId);
    if (!po) return;
    const firstItem = po.items?.[0];
    try {
      await apiFetch("/procurement/grn", {
        method: "POST",
        body: {
          purchaseOrderId: po._id,
          items: [{
            productId: firstItem?.productId,
            productName: firstItem?.productName || "PO Item",
            warehouseId: form.warehouseId,
            warehouseName: form.warehouseName,
            quantityReceived: Number(form.quantityReceived),
            unitCost: firstItem?.unitPrice || 0,
          }],
        },
      });
      await load();
    } catch (error) { setErr(error.message); }
  }

  return <AdminShell title="Goods Receipt" user={null}><div className="space-y-6">
    <form onSubmit={createGrn} className="rounded-2xl border bg-white p-6 shadow-sm grid gap-3 md:grid-cols-2">
      {err ? <div className="text-red-600 text-sm md:col-span-2">{err}</div> : null}
      <select className="border rounded-lg px-3 py-2" value={form.purchaseOrderId} onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })} required>
        <option value="">Select purchase order</option>
        {orders.map((o) => <option key={o._id} value={o._id}>{o.poNumber} - {o.supplierName}</option>)}
      </select>
      <input className="border rounded-lg px-3 py-2" type="number" placeholder="Qty received" value={form.quantityReceived} onChange={(e) => setForm({ ...form, quantityReceived: e.target.value })} required />
      <button className="rounded-lg bg-zinc-900 text-white px-4 py-2">Post GRN</button>
    </form>
    <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr><th>GRN #</th><th>PO #</th><th>Supplier</th><th>Qty</th><th>Date</th></tr></thead><tbody>{receipts.map((r) => <tr key={r._id}><td>{r.grnNumber}</td><td>{r.poNumber}</td><td>{r.supplierName}</td><td>{Number(r.totalReceivedQty || 0).toLocaleString()}</td><td>{r.receivedDate ? new Date(r.receivedDate).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
  </div></AdminShell>;
}
