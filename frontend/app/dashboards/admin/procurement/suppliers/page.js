"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const initialForm = { name: "", contactPerson: "", phone: "", email: "", paymentTerms: "Net 30" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [err, setErr] = useState("");

  const load = async () => {
    const data = await apiFetch("/procurement/suppliers");
    setSuppliers(data.suppliers || []);
  };

  useEffect(() => {
    async function initialLoad() {
      try {
        await load();
      } catch (e) {
        setErr(e.message || "Failed to load suppliers");
      }
    }
    initialLoad();
  }, []);

  const metrics = useMemo(() => {
    const active = suppliers.filter((s) => s.status === "active").length;
    return [
      { label: "Total", value: fmt(suppliers.length) },
      { label: "Active", value: fmt(active) },
      { label: "Avg Rating", value: suppliers.length ? (suppliers.reduce((x, y) => x + Number(y.rating || 0), 0) / suppliers.length).toFixed(1) : "0" },
    ];
  }, [suppliers]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await apiFetch("/procurement/suppliers", { method: "POST", body: form });
      setForm(initialForm);
      await load();
    } catch (error) {
      setErr(error.message || "Failed to create supplier");
    }
  }

  return <AdminShell title="Supplier Master" user={null}><div className="space-y-6">
    <div className="rounded-2xl border bg-white p-6 shadow-sm"><div className="text-xl font-semibold">Supplier Master</div>{err ? <div className="text-red-600 text-sm mt-2">{err}</div> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">{metrics.map((m) => <div key={m.label} className="rounded-xl border p-3"><div className="text-xs text-zinc-500">{m.label}</div><div className="text-lg font-semibold">{m.value}</div></div>)}</div>
    </div>

    <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 shadow-sm grid gap-3 md:grid-cols-2">
      <input className="border rounded-lg px-3 py-2" placeholder="Supplier Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="border rounded-lg px-3 py-2" placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
      <input className="border rounded-lg px-3 py-2" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className="border rounded-lg px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input className="border rounded-lg px-3 py-2" placeholder="Payment Terms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
      <button className="rounded-lg bg-zinc-900 text-white px-4 py-2">Create Supplier</button>
    </form>

    <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr><th className="text-left">Code</th><th className="text-left">Supplier</th><th className="text-left">Contact</th><th className="text-left">Terms</th><th className="text-left">Status</th></tr></thead><tbody>{suppliers.map((s) => <tr key={s._id}><td>{s.supplierCode}</td><td>{s.name}</td><td>{s.phone || s.email || "—"}</td><td>{s.paymentTerms || "—"}</td><td className="capitalize">{s.status}</td></tr>)}</tbody></table></div>
  </div></AdminShell>;
}

function fmt(v) { return Number(v || 0).toLocaleString(); }
