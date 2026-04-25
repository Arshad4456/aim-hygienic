"use client";
import { useEffect, useMemo, useState } from "react";
import primarySalesService from "../../../services/primarySalesService";

const TABS = [
  ["overview", "Overview"],
  ["distributors", "Distributors"],
  ["orders", "Primary Orders"],
  ["dispatches", "Dispatches"],
  ["invoices", "Distributor Invoices"],
  ["stock-receipts", "Distributor Receipts"],
];

function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function dateText(value) { return value ? new Date(value).toLocaleDateString() : "-"; }
function distributorName(row = {}) { return row.partyName || row.fullName || row.username || row.distributorName || row.name || "Distributor"; }
function productName(row = {}) { return row.name || row.productName || row.code || "Product"; }
function warehouseName(row = {}) { return row.name || row.warehouseName || row.warehouseId || "Warehouse"; }
function statusBadge(status) { const s = String(status || "draft"); const color = s.includes("posted") || s.includes("approved") || s.includes("received") ? "bg-emerald-50 text-emerald-700" : s.includes("draft") ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"; return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{s}</span>; }

export default function PrimarySalesFoundationPage() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState(null);
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stockReceipts, setStockReceipts] = useState([]);
  const [form, setForm] = useState({ distributorId: "", warehouseId: "", notes: "", lines: [{ productId: "", productName: "", qty: 1, unitPrice: 0, unitCost: 0 }] });

  async function load() {
    setLoading(true); setError("");
    try {
      const [overviewRes, distributorsRes, productsRes, warehousesRes, ordersRes, dispatchesRes, invoicesRes, receiptsRes] = await Promise.all([
        primarySalesService.overview(), primarySalesService.distributors(), primarySalesService.products(), primarySalesService.warehouses(), primarySalesService.orders(), primarySalesService.dispatches(), primarySalesService.invoices(), primarySalesService.stockReceipts(),
      ]);
      setOverview(overviewRes.overview || overviewRes);
      setDistributors(distributorsRes.distributors || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setOrders(ordersRes.orders || []);
      setDispatches(dispatchesRes.dispatches || []);
      setInvoices(invoicesRes.invoices || []);
      setStockReceipts(receiptsRes.receipts || []);
    } catch (e) { setError(e.message || "Failed to load primary sales data"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const total = useMemo(() => form.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0), [form.lines]);
  const dispatchByOrder = useMemo(() => new Map(dispatches.map((d) => [String(d.companySalesOrderId), d])), [dispatches]);

  function setLine(index, key, value) {
    setForm((current) => {
      const lines = current.lines.map((line, i) => i === index ? { ...line, [key]: value } : line);
      if (key === "productId") {
        const product = products.find((p) => String(p._id || p.productId || p.code || p.name) === String(value));
        if (product) lines[index] = { ...lines[index], productId: product.productId || product._id || product.name, productCode: product.code || product.sku || product.productId, productName: product.name, unitPrice: Number(product.tradePrice || product.wholesalePrice || product.retailPrice || product.customerPrice || 0), unitCost: Number(product.costPrice || 0) };
      }
      return { ...current, lines };
    });
  }
  function addLine() { setForm((current) => ({ ...current, lines: [...current.lines, { productId: "", productName: "", qty: 1, unitPrice: 0, unitCost: 0 }] })); }
  function removeLine(index) { setForm((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) || [] })); }

  async function action(label, fn) {
    setSaving(true); setError(""); setNotice("");
    try { const res = await fn(); setNotice(res?.message || `${label} completed successfully.`); await load(); }
    catch (e) { setError(e.message || `${label} failed`); }
    finally { setSaving(false); }
  }

  async function saveOrder() {
    const distributor = distributors.find((d) => String(d._id || d.userId || d.distributorId) === String(form.distributorId));
    const warehouse = warehouses.find((w) => String(w._id || w.warehouseId) === String(form.warehouseId));
    await action("Primary sales order", () => primarySalesService.createOrder({
      distributorId: form.distributorId,
      distributor: distributor ? { partyId: distributor._id || distributor.userId || distributor.distributorId, partyName: distributorName(distributor), mobile: distributor.mobile || distributor.mobileNumber, address: distributor.address || distributor.shopAddress } : undefined,
      dispatchFromWarehouse: warehouse ? { partyId: warehouse._id || warehouse.warehouseId, partyName: warehouseName(warehouse), address: warehouse.address } : undefined,
      notes: form.notes,
      lines: form.lines.filter((line) => line.productName || line.productId),
      totals: { grandTotal: total },
    }));
    setForm({ distributorId: "", warehouseId: "", notes: "", lines: [{ productId: "", productName: "", qty: 1, unitPrice: 0, unitCost: 0 }] });
  }

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 p-6 ring-1 ring-cyan-100">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">Phase 6 Primary Sales</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">Company → Distributor</h2>
      <p className="mt-2 max-w-4xl text-sm text-slate-600">Create a primary sales order, approve it, create and post dispatch, generate distributor invoice, then post distributor stock receipt.</p>
    </div>
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Correct flow:</b> order approval does not reduce stock. Stock reduces only when company dispatch is posted. Distributor stock increases only when distributor receipt is posted.</div>
    <div className="flex flex-wrap gap-2">{TABS.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"}`}>{label}</button>)}</div>
    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}
    {notice ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading primary sales data…</div> : null}

    {!loading && tab === "overview" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["Primary Orders", overview?.kpis?.orders, "Company sales orders to distributors"], ["Approved", overview?.kpis?.approvedOrders, "Ready to dispatch"], ["Draft Dispatches", overview?.kpis?.draftDispatches, "Created but not posted"], ["Invoice Balance", money(overview?.kpis?.invoiceBalance), "Distributor receivable balance"], ["Posted Dispatches", overview?.kpis?.postedDispatches, "Company stock reduced"], ["Invoice Total", money(overview?.kpis?.invoiceTotal), "Primary sales invoiced"], ["Receipt Drafts", overview?.kpis?.distributorReceiptDrafts, "Distributor stock pending"], ["Company Stock Qty", overview?.kpis?.companyStockBalance, "Available after ledger movements"],
    ].map(([label, value, help]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value || 0}</p><p className="mt-2 text-sm text-slate-500">{help}</p></div>)}</div> : null}

    {!loading && tab === "distributors" ? <Table title="Distributors" rows={distributors} columns={["Name", "Mobile", "Email", "Status"]} render={(row) => [distributorName(row), row.mobile || row.mobileNumber || row.phoneNumber || "-", row.email || "-", row.status || "active"]} /> : null}

    {!loading && tab === "orders" ? <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
      <Table title="Primary Sales Orders" rows={orders} columns={["Order", "Distributor", "Total", "Status", "Financial", "Actions"]} render={(row) => { const dispatch = dispatchByOrder.get(String(row._id)); return [row.documentNo, row.distributor?.partyName || "-", money(row.totals?.grandTotal), statusBadge(row.status), row.financialStatus || "not_invoiced", <div className="flex flex-wrap gap-2" key="a">{!["approved", "ready_to_dispatch", "dispatched", "received", "closed"].includes(row.status) ? <button disabled={saving} onClick={() => action("Approve order", () => primarySalesService.approveOrder(row._id))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Approve</button> : null}{["approved", "ready_to_dispatch"].includes(row.status) && !dispatch ? <button disabled={saving} onClick={() => action("Create dispatch", () => primarySalesService.createDispatch(row._id))} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Create Dispatch</button> : null}{dispatch ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Dispatch: {dispatch.status}</span> : null}</div>]; }} />
      <FormCard title="Create Primary Sales Order"><label className="text-sm font-bold text-slate-700">Distributor<select value={form.distributorId} onChange={(e) => setForm({ ...form, distributorId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Select distributor</option>{distributors.map((d) => <option key={d._id || d.userId} value={d._id || d.userId || d.distributorId}>{distributorName(d)}</option>)}</select></label><label className="text-sm font-bold text-slate-700">Dispatch warehouse<select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Auto select warehouse</option>{warehouses.map((w) => <option key={w._id || w.warehouseId} value={w._id || w.warehouseId}>{warehouseName(w)}</option>)}</select></label>{form.lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_70px_100px_auto]"><select value={line.productId} onChange={(e) => setLine(index, "productId", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="">Select product</option>{products.map((p) => <option key={p._id || p.productId || p.name} value={p.productId || p._id || p.name}>{productName(p)}</option>)}</select><input value={line.qty} onChange={(e) => setLine(index, "qty", e.target.value)} type="number" placeholder="Qty" className="rounded-xl border border-slate-200 px-3 py-2" /><input value={line.unitPrice} onChange={(e) => setLine(index, "unitPrice", e.target.value)} type="number" placeholder="Price" className="rounded-xl border border-slate-200 px-3 py-2" /><button onClick={() => removeLine(index)} className="rounded-xl bg-slate-100 px-3 text-xs font-bold">Remove</button></div>)}<button onClick={addLine} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Add Line</button><p className="text-right text-sm font-black text-slate-900">Total: {money(total)}</p><button disabled={saving || !form.distributorId || !form.lines.length} onClick={saveOrder} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Save Primary Order</button></FormCard>
    </div> : null}

    {!loading && tab === "dispatches" ? <Table title="Company Dispatch Notes" rows={dispatches} columns={["Dispatch", "Order", "Status", "Dispatched", "Actions"]} render={(row) => [row.documentNo, row.companySalesOrderId || "-", statusBadge(row.status), dateText(row.dispatchedAt || row.createdAt), row.status === "draft" ? <button key="post" disabled={saving} onClick={() => action("Post dispatch", () => primarySalesService.postDispatch(row._id))} className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Post Dispatch</button> : <span key="posted" className="text-xs font-bold text-emerald-700">Stock dispatched</span>]} /> : null}

    {!loading && tab === "invoices" ? <Table title="Company Invoices to Distributor" rows={invoices} columns={["Invoice", "Distributor", "Total", "Balance", "Status"]} render={(row) => [row.documentNo, row.distributor?.partyName || "-", money(row.invoiceTotal), money(row.balanceAmount), row.paymentStatus || row.status]} /> : null}

    {!loading && tab === "stock-receipts" ? <Table title="Distributor Stock Receipts" rows={stockReceipts} columns={["Receipt", "Distributor", "Status", "Received", "Actions"]} render={(row) => [row.documentNo, row.distributorId || "-", statusBadge(row.status), dateText(row.receivedAt || row.createdAt), row.status === "draft" ? <button key="post" disabled={saving} onClick={() => action("Post distributor receipt", () => primarySalesService.postStockReceipt(row._id))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Post Receipt</button> : <span key="posted" className="text-xs font-bold text-emerald-700">Distributor stock posted</span>]} /> : null}
  </div>;
}

function FormCard({ title, children }) { return <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{title}</h3>{children}</div>; }
function Table({ title, rows = [], columns = [], render }) { return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row._id || idx} className="border-t border-slate-100">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 align-middle text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>; }
