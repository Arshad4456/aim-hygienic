"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function SupplierPaymentsPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ supplierId: "", amount: 0, method: "bank_transfer", status: "pending" });
  const [err, setErr] = useState("");

  const load = async () => {
    const [sData, pData] = await Promise.all([apiFetch("/procurement/suppliers"), apiFetch("/procurement/payments")]);
    setSuppliers(sData.suppliers || []);
    setPayments(pData.payments || []);
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

  async function createPayment(e) {
    e.preventDefault();
    try {
      await apiFetch("/procurement/payments", { method: "POST", body: { ...form, amount: Number(form.amount) } });
      await load();
    } catch (error) { setErr(error.message); }
  }

  return <AdminShell title="Supplier Payments" user={null}><div className="space-y-6">
    <form onSubmit={createPayment} className="rounded-2xl border bg-white p-6 shadow-sm grid gap-3 md:grid-cols-2">
      {err ? <div className="text-red-600 text-sm md:col-span-2">{err}</div> : null}
      <select className="border rounded-lg px-3 py-2" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
        <option value="">Select supplier</option>{suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
      <input className="border rounded-lg px-3 py-2" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
      <select className="border rounded-lg px-3 py-2" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="mobile_banking">Mobile banking</option></select>
      <button className="rounded-lg bg-zinc-900 text-white px-4 py-2">Create Payment</button>
    </form>
    <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr><th>Payment #</th><th>Supplier</th><th>Amount</th><th>Status</th><th>Method</th></tr></thead><tbody>{payments.map((p) => <tr key={p._id}><td>{p.paymentNumber}</td><td>{p.supplierName}</td><td>₨ {Number(p.amount || 0).toLocaleString()}</td><td>{p.status}</td><td>{p.method}</td></tr>)}</tbody></table></div>
  </div></AdminShell>;
}
