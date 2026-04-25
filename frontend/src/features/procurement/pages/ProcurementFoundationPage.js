"use client";
import { useEffect, useMemo, useState } from "react";
import procurementService from "../../../services/procurementService";

const TABS = [
  ["overview", "Overview"],
  ["suppliers", "Suppliers"],
  ["purchase-orders", "Purchase Orders"],
  ["goods-receipts", "Goods Receipts"],
  ["supplier-finance", "Supplier Finance"],
];
const emptyLine = { productName: "", qty: 1, unitCost: 0 };
function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function dateText(value) { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString(); }
function supplierName(row) { return row?.supplierName || row?.fullName || row?.username || row?.supplier?.partyName || row?.partyName || "-"; }
function lineTotal(line) { return Number(line.qty || 0) * Number(line.unitCost || 0); }

export default function ProcurementFoundationPage({ mode = "overview" }) {
  const initialTab = mode === "purchase-orders" ? "purchase-orders" : mode === "supplier-payments" ? "supplier-finance" : mode === "goods-receipts" ? "goods-receipts" : "overview";
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [supplierForm, setSupplierForm] = useState({ supplierName: "", phone: "", email: "", city: "", paymentTermsDays: 15 });
  const [poForm, setPoForm] = useState({ supplierId: "", expectedDate: "", notes: "", lines: [{ ...emptyLine }] });

  async function load() {
    setLoading(true); setError("");
    try {
      const [overviewPayload, suppliersPayload, poPayload, grnPayload, invoicePayload, paymentPayload] = await Promise.all([
        procurementService.overview(), procurementService.suppliers(), procurementService.purchaseOrders(), procurementService.goodsReceipts(), procurementService.supplierInvoices(), procurementService.supplierPayments(),
      ]);
      setOverview(overviewPayload?.kpis || {});
      setSuppliers(suppliersPayload?.suppliers || []);
      setPurchaseOrders(poPayload?.purchaseOrders || []);
      setGoodsReceipts(grnPayload?.goodsReceipts || []);
      setInvoices(invoicePayload?.invoices || []);
      setPayments(paymentPayload?.payments || []);
    } catch (e) { setError(e.message || "Unable to load procurement foundation"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const selectedSupplier = useMemo(() => suppliers.find((s) => String(s._id || s.id || s.linkedUserId || "") === String(poForm.supplierId)), [poForm.supplierId, suppliers]);
  const poTotal = useMemo(() => poForm.lines.reduce((sum, line) => sum + lineTotal(line), 0), [poForm.lines]);
  function setLine(index, field, value) { setPoForm((current) => ({ ...current, lines: current.lines.map((line, i) => i === index ? { ...line, [field]: value } : line) })); }
  function addLine() { setPoForm((current) => ({ ...current, lines: [...current.lines, { ...emptyLine }] })); }
  function removeLine(index) { setPoForm((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) })); }
  async function saveSupplier() { setSaving(true); setError(""); setNotice(""); try { await procurementService.createSupplier(supplierForm); setSupplierForm({ supplierName: "", phone: "", email: "", city: "", paymentTermsDays: 15 }); setNotice("Supplier created successfully."); await load(); setTab("suppliers"); } catch (e) { setError(e.message || "Unable to save supplier"); } finally { setSaving(false); } }
  async function savePurchaseOrder() {
    setSaving(true); setError(""); setNotice("");
    try {
      const lines = poForm.lines.filter((line) => line.productName).map((line) => ({ productName: line.productName, qty: Number(line.qty || 0), unitCost: Number(line.unitCost || 0) }));
      if (!selectedSupplier) throw new Error("Select a supplier first");
      if (!lines.length) throw new Error("Add at least one purchase item");
      await procurementService.createPurchaseOrder({ supplier: selectedSupplier, expectedDate: poForm.expectedDate, notes: poForm.notes, lines });
      setPoForm({ supplierId: "", expectedDate: "", notes: "", lines: [{ ...emptyLine }] }); setNotice("Purchase order created successfully."); await load(); setTab("purchase-orders");
    } catch (e) { setError(e.message || "Unable to save purchase order"); } finally { setSaving(false); }
  }
  async function approvePO(id) { setSaving(true); setError(""); try { await procurementService.approvePurchaseOrder(id); setNotice("Purchase order approved."); await load(); } catch (e) { setError(e.message || "Unable to approve purchase order"); } finally { setSaving(false); } }
  async function receivePO(id) { setSaving(true); setError(""); try { await procurementService.receivePurchaseOrder(id); setNotice("Goods receipt created from purchase order."); await load(); setTab("goods-receipts"); } catch (e) { setError(e.message || "Unable to receive purchase order"); } finally { setSaving(false); } }

  return <div className="space-y-5">
    <div className="rounded-3xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.24em] opacity-90">Phase 4 Supply Chain</p>
      <h2 className="mt-2 text-3xl font-black">Supplier → Company Procurement</h2>
      <p className="mt-2 max-w-3xl text-sm text-cyan-50">Manage supplier master records, purchase orders, goods receipts, supplier invoices, and payable exposure before stock enters company warehouses.</p>
    </div>
    <div className="flex flex-wrap gap-2">{TABS.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"}`}>{label}</button>)}</div>
    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}{notice ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading procurement data…</div> : null}
    {!loading && tab === "overview" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[
      ["Suppliers", overview?.suppliers, "Active supplier master and linked supplier users"], ["Purchase Orders", overview?.purchaseOrders, `${overview?.openOrders || 0} open orders`], ["Goods Receipts", overview?.goodsReceipts, "Inbound GRN documents"], ["Invoice Exposure", money(overview?.invoiceTotal), "Supplier invoices"], ["Payable Balance", money(overview?.payableBalance), "Outstanding supplier balance"], ["Paid Total", money(overview?.paidTotal), "Approved or posted supplier payments"],
    ].map(([label, value, help]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value || 0}</p><p className="mt-2 text-sm text-slate-500">{help}</p></div>)}</div> : null}
    {!loading && tab === "suppliers" ? <div className="grid gap-5 xl:grid-cols-[1fr_420px]"><Table title="Supplier Master" rows={suppliers} columns={["Supplier", "Phone", "Email", "Status"]} render={(row) => [supplierName(row), row.phone || row.mobile || row.mobileNumber || "-", row.email || "-", row.status || "active"]} /><FormCard title="Create Supplier"><Input label="Supplier name" value={supplierForm.supplierName} onChange={(v) => setSupplierForm({ ...supplierForm, supplierName: v })} /><Input label="Phone" value={supplierForm.phone} onChange={(v) => setSupplierForm({ ...supplierForm, phone: v })} /><Input label="Email" value={supplierForm.email} onChange={(v) => setSupplierForm({ ...supplierForm, email: v })} /><Input label="City" value={supplierForm.city} onChange={(v) => setSupplierForm({ ...supplierForm, city: v })} /><button disabled={saving || !supplierForm.supplierName} onClick={saveSupplier} className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Save Supplier</button></FormCard></div> : null}
    {!loading && tab === "purchase-orders" ? <div className="grid gap-5 xl:grid-cols-[1fr_460px]"><Table title="Purchase Orders" rows={purchaseOrders} columns={["PO", "Supplier", "Amount", "Status", "Actions"]} render={(row) => [row.documentNo, row.supplier?.partyName || "-", money(row.totals?.grandTotal), row.status, <div className="flex flex-wrap gap-2" key="a"><button onClick={() => approvePO(row._id)} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Approve</button><button onClick={() => receivePO(row._id)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Create GRN</button></div>]} /><FormCard title="Create Purchase Order"><label className="text-sm font-bold text-slate-700">Supplier<select value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Select supplier</option>{suppliers.map((s) => <option key={s._id || s.linkedUserId} value={s._id || s.linkedUserId}>{supplierName(s)}</option>)}</select></label><Input label="Expected date" type="date" value={poForm.expectedDate} onChange={(v) => setPoForm({ ...poForm, expectedDate: v })} />{poForm.lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_80px_100px_auto]"><input value={line.productName} onChange={(e) => setLine(index, "productName", e.target.value)} placeholder="Product" className="rounded-xl border border-slate-200 px-3 py-2" /><input value={line.qty} onChange={(e) => setLine(index, "qty", e.target.value)} type="number" placeholder="Qty" className="rounded-xl border border-slate-200 px-3 py-2" /><input value={line.unitCost} onChange={(e) => setLine(index, "unitCost", e.target.value)} type="number" placeholder="Cost" className="rounded-xl border border-slate-200 px-3 py-2" /><button onClick={() => removeLine(index)} className="rounded-xl bg-slate-100 px-3 text-xs font-bold">Remove</button></div>)}<button onClick={addLine} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Add Line</button><p className="text-right text-sm font-black text-slate-900">Total: {money(poTotal)}</p><button disabled={saving} onClick={savePurchaseOrder} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Save Purchase Order</button></FormCard></div> : null}
    {!loading && tab === "goods-receipts" ? <Table title="Goods Receipts" rows={goodsReceipts} columns={["GRN", "PO", "Supplier", "Status", "Received"]} render={(row) => [row.documentNo, row.purchaseOrderNo || "-", row.supplier?.partyName || "-", row.status, dateText(row.receivedAt || row.createdAt)]} /> : null}
    {!loading && tab === "supplier-finance" ? <div className="grid gap-5 xl:grid-cols-2"><Table title="Supplier Invoices" rows={invoices} columns={["Invoice", "Supplier", "Total", "Balance", "Status"]} render={(row) => [row.documentNo, row.supplier?.partyName || "-", money(row.invoiceTotal), money(row.balanceAmount), row.paymentStatus]} /><Table title="Supplier Payments" rows={payments} columns={["Payment", "Supplier", "Amount", "Method", "Status"]} render={(row) => [row.documentNo, row.supplier?.partyName || "-", money(row.amount), row.paymentMethod || "-", row.status]} /></div> : null}
  </div>;
}

function Input({ label, value, onChange, type = "text" }) { return <label className="block text-sm font-bold text-slate-700">{label}<input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-normal" /></label>; }
function FormCard({ title, children }) { return <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{title}</h3>{children}</div>; }
function Table({ title, rows = [], columns = [], render }) { return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row._id || idx} className="border-t border-slate-100">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>; }
