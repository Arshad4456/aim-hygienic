"use client";
import { useEffect, useMemo, useState } from "react";
import secondarySalesService from "@/src/app/modules/distribution/sales/services/secondarySalesService";

const TABS = [["overview", "Overview"], ["customers", "Customers"], ["stock", "Distributor Stock"], ["orders", "Secondary Orders"], ["invoices", "Customer Invoices"], ["receipts", "Customer Receipts"]];
const emptyLine = { distributorId: "", productId: "", productCode: "", productName: "", warehouseId: "", availableQty: 0, qty: 1, unitPrice: 0, unitCost: 0 };
function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function nameOf(row = {}) { return row.partyName || row.customerName || row.fullName || row.username || row.distributorName || row.productName || row.name || "-"; }
function distributorIdOf(row = {}) { return String(row._id || row.userId || row.distributorId || row.id || ""); }
function statusBadge(status) { const s = String(status || "draft"); const color = s.includes("paid") || s.includes("posted") || s.includes("approved") || s.includes("delivered") ? "bg-emerald-50 text-emerald-700" : s.includes("draft") || s.includes("submitted") ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"; return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{s}</span>; }

export default function SecondarySalesFoundationPage() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState(null);
  const [distributors, setDistributors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [form, setForm] = useState({ distributorId: "", customerId: "", notes: "", lines: [{ ...emptyLine }] });

  async function load(distributorId = form.distributorId) {
    setLoading(true); setError("");
    try {
      const params = distributorId ? { distributorId } : {};
      const [overviewRes, distributorsRes, customersRes, productsRes, ordersRes, invoicesRes, receiptsRes] = await Promise.all([
        secondarySalesService.overview(params), secondarySalesService.distributors(), secondarySalesService.customers(), secondarySalesService.products(params), secondarySalesService.orders(params), secondarySalesService.invoices(params), secondarySalesService.receipts(params),
      ]);
      setOverview(overviewRes.overview || overviewRes);
      setDistributors(distributorsRes.distributors || []);
      setCustomers(customersRes.customers || []);
      setProducts(productsRes.products || []);
      setOrders(ordersRes.orders || []);
      setInvoices(invoicesRes.invoices || []);
      setReceipts(receiptsRes.receipts || []);
    } catch (e) { setError(e.message || "Unable to load secondary sales data"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(""); }, []);
  const total = useMemo(() => form.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0), [form.lines]);
  const distributorMap = useMemo(() => new Map(distributors.map((d) => [distributorIdOf(d), nameOf(d)])), [distributors]);

  async function selectDistributor(distributorId) {
    setForm((current) => ({ ...current, distributorId, lines: [{ ...emptyLine, distributorId }] }));
    await load(distributorId);
  }
  function setLine(index, key, value) {
    setForm((current) => {
      const lines = current.lines.map((line, i) => i === index ? { ...line, [key]: value } : line);
      if (key === "productId") {
        const product = products.find((p) => String(`${p.distributorId || ""}:${p.productId || ""}:${p.warehouseId || ""}`) === String(value));
        if (product) lines[index] = { ...lines[index], distributorId: product.distributorId || current.distributorId, productId: product.productId, productCode: product.productCode, productName: product.productName, warehouseId: product.warehouseId, availableQty: Number(product.availableQty || 0), unitCost: Number(product.unitCost || 0), unitPrice: Number(product.unitPrice || product.tradePrice || product.unitCost || 0) };
      }
      return { ...current, distributorId: current.distributorId || lines[index]?.distributorId || "", lines };
    });
  }
  function addLine() { setForm((current) => ({ ...current, lines: [...current.lines, { ...emptyLine, distributorId: current.distributorId }] })); }
  function removeLine(index) { setForm((current) => ({ ...current, lines: current.lines.filter((_, i) => i !== index) })); }
  async function action(label, fn) { setSaving(true); setError(""); setNotice(""); try { const res = await fn(); setNotice(res?.message || `${label} completed successfully.`); await load(form.distributorId); } catch (e) { setError(e.message || `${label} failed`); } finally { setSaving(false); } }
  async function attachPod(row) { const podUrl = window.prompt("Paste Cloudflare R2 customer proof-of-delivery URL"); if (!podUrl) return; await action("Customer POD", () => secondarySalesService.attachPod(row._id, { podUrl })); }
  async function saveOrder() {
    const distributor = distributors.find((d) => distributorIdOf(d) === String(form.distributorId));
    const customer = customers.find((c) => String(c._id || c.userId || c.customerId) === String(form.customerId));
    const lines = form.lines.filter((line) => line.productName && Number(line.qty || 0) > 0).map((line) => ({ distributorId: line.distributorId || form.distributorId, productId: line.productId, productCode: line.productCode, productName: line.productName, qty: Number(line.qty || 0), unitPrice: Number(line.unitPrice || 0), unitCost: Number(line.unitCost || 0), warehouseId: line.warehouseId }));
    if (!form.distributorId) { setError("Select distributor first. Distributor stock belongs to a specific distributor warehouse."); return; }
    if (!customer) { setError("Select customer first."); return; }
    if (!lines.length) { setError("Add at least one distributor stock item."); return; }
    await action("Secondary sales order", () => secondarySalesService.createOrder({ distributorId: form.distributorId, distributor: distributor ? { partyId: distributorIdOf(distributor), partyName: nameOf(distributor) } : undefined, customerId: form.customerId, customer: { partyId: customer._id || customer.userId || customer.customerId, partyName: nameOf(customer), mobile: customer.mobile || customer.mobileNumber, address: customer.address || customer.shopAddress }, lines, totals: { grandTotal: total }, notes: form.notes }));
    setForm({ distributorId: form.distributorId, customerId: "", notes: "", lines: [{ ...emptyLine, distributorId: form.distributorId }] });
    setTab("orders");
  }

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 p-6 ring-1 ring-cyan-100"><p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">Secondary Sales & Customer Delivery</p><h2 className="mt-2 text-3xl font-black text-slate-950">Distributor → Customer</h2><p className="mt-2 max-w-4xl text-sm text-slate-600">Distributor/customer ordering, delivery, customer invoice, receipt, and proof-of-delivery controls are connected with distributor stock.</p></div>
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Correct flow:</b> primary dispatch creates a distributor receipt draft. Distributor stock becomes available only after that receipt is posted.</div>
    <div className="flex flex-wrap gap-2">{TABS.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"}`}>{label}</button>)}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><label className="text-sm font-bold text-slate-700">Distributor stock owner<select value={form.distributorId} onChange={(e) => selectDistributor(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">All distributors / select for order creation</option>{distributors.map((d) => <option key={distributorIdOf(d)} value={distributorIdOf(d)}>{nameOf(d)}</option>)}</select></label></div>
    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}{notice ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading secondary sales data…</div> : null}
    {!loading && tab === "overview" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[["Customers", overview?.kpis?.customers, "Customers available for secondary sales"],["Stock Products", overview?.kpis?.stockProducts, "Distributor stock lines with balance"],["Secondary Orders", overview?.kpis?.secondaryOrders, "Customer orders"],["Approved", overview?.kpis?.approvedOrders, "Ready to deliver"],["Delivered", overview?.kpis?.deliveredOrders, "Stock reduced and invoiced"],["Invoice Total", overview?.kpis?.invoiceTotal, "Customer sales invoiced"],["Receivable", overview?.kpis?.receivableBalance, "Customer outstanding"],["Receipts", overview?.kpis?.receiptTotal, "Customer payments posted"]].map(([label, value, help]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value || 0}</p><p className="mt-2 text-sm text-slate-500">{help}</p></div>)}</div> : null}
    {!loading && tab === "customers" ? <Table title="Customers" rows={customers} columns={["Customer", "Mobile", "Email", "Status"]} render={(row) => [nameOf(row), row.mobile || row.mobileNumber || row.phoneNumber || "-", row.email || "-", row.status || "active"]} /> : null}
    {!loading && tab === "stock" ? <Table title="Distributor Stock Available" rows={products} columns={["Distributor", "Product", "Code", "Warehouse", "Available", "Cost"]} render={(row) => [distributorMap.get(String(row.distributorId)) || row.distributorId || "-", row.productName, row.productCode || "-", row.warehouseName || row.warehouseId || "-", row.availableQty, money(row.unitCost)]} /> : null}
    {!loading && tab === "orders" ? <div className="grid gap-5 xl:grid-cols-[1fr_520px]"><Table title="Secondary Sales Orders" rows={orders} columns={["Order", "Customer", "Total", "Status", "Dispatch", "Financial", "Actions"]} render={(row) => [row.documentNo, row.customer?.partyName || "-", money(row.totals?.grandTotal), statusBadge(row.status), row.dispatchStatus || "-", row.financialStatus || "-", <div className="flex flex-wrap gap-2" key="a">{["draft", "submitted"].includes(row.status) ? <button disabled={saving} onClick={() => action("Approve secondary order", () => secondarySalesService.approveOrder(row._id))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Approve</button> : null}{["approved", "reserved"].includes(row.status) ? <button disabled={saving} onClick={() => action("Deliver and invoice", () => secondarySalesService.fulfillOrder(row._id, { warehouseId: row.lines?.[0]?.warehouseId }))} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Deliver + Invoice</button> : null}<button disabled={saving} onClick={() => attachPod(row)} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Attach POD</button>{row.podUrl ? <a href={row.podUrl} target="_blank" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Open POD</a> : null}</div>]} /><FormCard title="Create Customer Order"><label className="text-sm font-bold text-slate-700">Customer<select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Select customer</option>{customers.map((c) => <option key={c._id || c.userId || c.customerId} value={c._id || c.userId || c.customerId}>{nameOf(c)}</option>)}</select></label>{form.lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_80px_100px_auto]"><select value={line.distributorId && line.productId && line.warehouseId ? `${line.distributorId}:${line.productId}:${line.warehouseId}` : ""} onChange={(e) => setLine(index, "productId", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="">Select distributor stock</option>{products.map((p) => <option key={`${p.distributorId}:${p.productId}:${p.warehouseId}`} value={`${p.distributorId}:${p.productId}:${p.warehouseId}`}>{p.productName} — {distributorMap.get(String(p.distributorId)) || p.distributorId} — available {p.availableQty}</option>)}</select><input value={line.qty} onChange={(e) => setLine(index, "qty", e.target.value)} type="number" min="1" max={line.availableQty || undefined} className="rounded-xl border border-slate-200 px-3 py-2" /><input value={line.unitPrice} onChange={(e) => setLine(index, "unitPrice", e.target.value)} type="number" placeholder="Price" className="rounded-xl border border-slate-200 px-3 py-2" /><button onClick={() => removeLine(index)} className="rounded-xl bg-slate-100 px-3 text-xs font-bold">Remove</button></div>)}<button onClick={addLine} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Add Line</button><p className="text-right text-sm font-black text-slate-900">Total: {money(total)}</p><button disabled={saving} onClick={saveOrder} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Save Secondary Order</button></FormCard></div> : null}
    {!loading && tab === "invoices" ? <Table title="Customer Invoices" rows={invoices} columns={["Invoice", "Customer", "Total", "Balance", "Status", "Action"]} render={(row) => [row.documentNo, row.customer?.partyName || "-", money(row.invoiceTotal), money(row.balanceAmount), row.paymentStatus, Number(row.balanceAmount || 0) > 0 ? <button key="pay" disabled={saving} onClick={() => action("Customer receipt", () => secondarySalesService.payInvoice(row._id, { amount: row.balanceAmount, paymentMethod: "cash" }))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Receive</button> : <span key="paid" className="text-xs font-bold text-slate-500">Paid</span>]} /> : null}
    {!loading && tab === "receipts" ? <Table title="Customer Receipts" rows={receipts} columns={["Receipt", "Customer", "Amount", "Method", "Status"]} render={(row) => [row.documentNo, row.customer?.partyName || "-", money(row.amount), row.paymentMethod || "-", row.status]} /> : null}
  </div>;
}

function FormCard({ title, children }) { return <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{title}</h3>{children}</div>; }
function Table({ title, rows = [], columns = [], render }) { return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row._id || idx} className="border-t border-slate-100">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>; }
