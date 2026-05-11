"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/src/app/infrastructure/api/apiClient";

const tabs = [["pos", "POS Billing"], ["sessions", "Cashier Sessions"], ["sales", "Sales / Receipts"], ["returns", "Returns"], ["reports", "Daily Closing"]];
const emptyLine = { productId: "", productName: "", qty: 1, unitPrice: 0, discountValue: 0, taxPercent: 0 };
function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function statusBadge(status) { const s = String(status || "draft"); const color = s.includes("open") || s.includes("posted") ? "bg-emerald-50 text-emerald-700" : s.includes("closed") || s.includes("returned") ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"; return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{s}</span>; }
function productLabel(p = {}) { return p.name || p.productName || p.code || p.sku || "Product"; }
function recordId(row = {}) { return String(row._id || row.id || row.documentNo || row.sessionNo || ""); }
function exportCsv(filename, rows = []) { const cols = Object.keys(rows[0] || { empty: "" }); const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function printPayload(title, payload) { const w = window.open("", "_blank"); if (!w) return; w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:24px;color:#111827}pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:16px}.brand{font-size:20px;font-weight:800}</style></head><body><div class="brand">Rawyan ERP</div><h1>${title}</h1><pre>${JSON.stringify(payload, null, 2)}</pre><script>window.print()</script></body></html>`); w.document.close(); }

export default function RetailPosPortalPage() {
  const [tab, setTab] = useState("pos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({});
  const [sessions, setSessions] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sessionForm, setSessionForm] = useState({ warehouseId: "", warehouseName: "Main Warehouse", openingCash: 0, cashRegisterName: "Main Register" });
  const [saleForm, setSaleForm] = useState({ customerName: "Walk-in Customer", mobile: "", paymentMethod: "cash", amountPaid: "", lines: [{ ...emptyLine }] });
  const openSession = sessions.find((s) => s.status === "open");

  async function load() {
    setLoading(true); setError("");
    try {
      const [ov, se, sa, pr, cu] = await Promise.all([
        apiClient("/retail-pos/overview"),
        apiClient("/retail-pos/sessions"),
        apiClient("/retail-pos/sales"),
        apiClient("/retail-pos/products"),
        apiClient("/retail-pos/customers"),
      ]);
      setOverview(ov || {}); setSessions(se?.sessions || []); setSales(sa?.sales || []); setProducts(pr?.products || []); setCustomers(cu?.customers || []);
    } catch (err) {
      setError(err?.message || "Unable to load Retail POS module.");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const saleTotals = useMemo(() => {
    const subtotal = saleForm.lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0);
    const discountTotal = saleForm.lines.reduce((sum, line) => sum + Number(line.discountValue || 0), 0);
    const taxTotal = saleForm.lines.reduce((sum, line) => sum + ((Number(line.qty || 0) * Number(line.unitPrice || 0) - Number(line.discountValue || 0)) * Number(line.taxPercent || 0)) / 100, 0);
    return { subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
  }, [saleForm.lines]);

  function setLine(index, key, value) {
    const lines = saleForm.lines.map((line, i) => i === index ? { ...line, [key]: value } : line);
    if (key === "productId") {
      const product = products.find((p) => String(p.productId || p._id || p.code || p.sku) === String(value));
      lines[index] = { ...lines[index], productName: productLabel(product), unitPrice: product?.retailPrice || product?.customerPrice || product?.tradePrice || 0, taxPercent: product?.taxPer || 0 };
    }
    setSaleForm({ ...saleForm, lines });
  }

  async function onOpenSession() {
    setSaving(true); setError(""); setNotice("");
    try { await apiClient("/retail-pos/sessions/open", { method: "POST", body: sessionForm }); setNotice("POS session opened successfully."); await load(); }
    catch (err) { setError(err?.message || "Unable to open session."); }
    finally { setSaving(false); }
  }

  async function onCloseSession(session) {
    const closingCash = window.prompt("Closing cash amount", String(session.expectedCash || 0));
    if (closingCash === null) return;
    setSaving(true); setError(""); setNotice("");
    try { await apiClient(`/retail-pos/sessions/${recordId(session)}/close`, { method: "POST", body: { closingCash } }); setNotice("POS session closed and cash difference calculated."); await load(); }
    catch (err) { setError(err?.message || "Unable to close session."); }
    finally { setSaving(false); }
  }

  async function onPostSale() {
    setSaving(true); setError(""); setNotice("");
    try {
      const body = { ...saleForm, sessionId: openSession?._id, warehouseId: openSession?.warehouseId || sessionForm.warehouseId, warehouseName: openSession?.warehouseName || sessionForm.warehouseName, amountPaid: saleForm.amountPaid || saleTotals.grandTotal, customer: { partyType: "walk_in", partyName: saleForm.customerName, mobile: saleForm.mobile } };
      const result = await apiClient("/retail-pos/sales", { method: "POST", body });
      setNotice(`POS sale posted: ${result?.sale?.documentNo || "receipt ready"}.`);
      setSaleForm({ customerName: "Walk-in Customer", mobile: "", paymentMethod: "cash", amountPaid: "", lines: [{ ...emptyLine }] });
      await load();
      if (result?.sale) printPayload("POS Receipt", result.sale);
    } catch (err) { setError(err?.message || "Unable to post POS sale."); }
    finally { setSaving(false); }
  }

  async function onReturnSale(sale) {
    const reason = window.prompt("Return reason", "Customer return");
    if (reason === null) return;
    setSaving(true); setError(""); setNotice("");
    try { await apiClient(`/retail-pos/sales/${recordId(sale)}/return`, { method: "POST", body: { reason } }); setNotice("Sale return posted and stock added back."); await load(); }
    catch (err) { setError(err?.message || "Unable to return sale."); }
    finally { setSaving(false); }
  }

  async function onPrint(type, id, title) {
    try { const payload = await apiClient(`/retail-pos/print/${type}/${id}`); printPayload(title, payload); }
    catch (err) { setError(err?.message || "Unable to print document."); }
  }

  const kpis = overview?.kpis || {};
  return <div className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">Phase 7 Complete Module</p>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-3xl font-black text-slate-950">Retail POS ERP</h2><p className="mt-2 max-w-4xl text-sm text-slate-600">Fast billing, cashier session opening/closing, stock-ledger posting, receipt printing, returns, discounts, taxes, and daily cash reconciliation.</p></div><button onClick={load} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Refresh</button></div>
    </div>
    {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
    {notice ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{[{ label: "Open Sessions", value: overview.openSessions || 0 }, { label: "Orders", value: kpis.totalOrders || 0 }, { label: "Gross Sales", value: money(kpis.totalSales) }, { label: "Tax", value: money(kpis.totalTax) }, { label: "Discount", value: money(kpis.totalDiscount) }].map((item) => <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p><p className="mt-3 text-2xl font-black text-slate-950">{item.value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-black ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{label}</button>)}</div>
    {loading ? <div className="rounded-3xl bg-white p-6 text-sm text-slate-500">Loading Retail POS…</div> : null}

    {tab === "pos" ? <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">Cashier Session</h3>{openSession ? <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-black">Open: {openSession.sessionNo}</p><p>{openSession.warehouseName} · Expected cash {money(openSession.expectedCash)}</p><button disabled={saving} onClick={() => onCloseSession(openSession)} className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">Close Session</button></div> : <div className="mt-4 space-y-3"><input value={sessionForm.warehouseName} onChange={(e) => setSessionForm({ ...sessionForm, warehouseName: e.target.value })} placeholder="Warehouse name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={sessionForm.openingCash} onChange={(e) => setSessionForm({ ...sessionForm, openingCash: e.target.value })} type="number" placeholder="Opening cash" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button disabled={saving} onClick={onOpenSession} className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">Open Session</button></div>}</div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">POS Billing Screen</h3><div className="mt-4 grid gap-3 md:grid-cols-3"><input value={saleForm.customerName} onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Customer name" /><input value={saleForm.mobile} onChange={(e) => setSaleForm({ ...saleForm, mobile: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Mobile" /><select value={saleForm.paymentMethod} onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank</option><option value="wallet">Wallet</option><option value="credit">Credit</option></select></div><div className="mt-4 space-y-3">{saleForm.lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_80px_110px_110px_90px_auto]"><select value={line.productId} onChange={(e) => setLine(index, "productId", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select product / scan barcode</option>{products.map((p) => <option key={p._id || p.productId || p.code} value={p.productId || p._id || p.code}>{productLabel(p)} · Stock {p.availableQty || 0}</option>)}</select><input value={line.qty} onChange={(e) => setLine(index, "qty", e.target.value)} type="number" min="1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={line.unitPrice} onChange={(e) => setLine(index, "unitPrice", e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={line.discountValue} onChange={(e) => setLine(index, "discountValue", e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={line.taxPercent} onChange={(e) => setLine(index, "taxPercent", e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button onClick={() => setSaleForm({ ...saleForm, lines: saleForm.lines.filter((_, i) => i !== index) })} className="rounded-xl bg-slate-100 px-3 text-xs font-black">Remove</button></div>)}<button onClick={() => setSaleForm({ ...saleForm, lines: [...saleForm.lines, { ...emptyLine }] })} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">Add Product Line</button></div><div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-4"><p><b>Subtotal:</b> {money(saleTotals.subtotal)}</p><p><b>Discount:</b> {money(saleTotals.discountTotal)}</p><p><b>Tax:</b> {money(saleTotals.taxTotal)}</p><p className="font-black"><b>Total:</b> {money(saleTotals.grandTotal)}</p></div><div className="mt-4 flex flex-col gap-3 md:flex-row"><input value={saleForm.amountPaid} onChange={(e) => setSaleForm({ ...saleForm, amountPaid: e.target.value })} type="number" placeholder={`Amount paid (${saleTotals.grandTotal})`} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button disabled={saving} onClick={onPostSale} className="rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50">Post & Print Receipt</button></div></div>
    </div> : null}

    {tab === "sessions" ? <DataTable title="Cashier Sessions" rows={sessions} columns={["Session", "Cashier", "Warehouse", "Opening", "Expected", "Closing", "Difference", "Status", "Action"]} render={(s) => [s.sessionNo, s.cashierName || s.cashierId, s.warehouseName, money(s.openingCash), money(s.expectedCash), money(s.closingCash), money(s.cashDifference), statusBadge(s.status), <div className="flex gap-2"><button onClick={() => onPrint("session", recordId(s), "POS Session Closing")}>Print</button>{s.status === "open" ? <button onClick={() => onCloseSession(s)}>Close</button> : null}</div>]} /> : null}
    {tab === "sales" || tab === "returns" ? <DataTable title={tab === "returns" ? "Returned / Returnable Sales" : "POS Sales & Receipts"} rows={sales} columns={["Receipt", "Customer", "Cashier", "Total", "Paid", "Method", "Status", "Action"]} render={(s) => [s.documentNo, s.customer?.partyName, s.cashierName, money(s.totals?.grandTotal), money(s.amountPaid), s.paymentMethod, statusBadge(s.status), <div className="flex gap-2"><button onClick={() => onPrint("sale", recordId(s), "POS Receipt")}>Print</button>{s.status !== "returned" ? <button onClick={() => onReturnSale(s)}>Return</button> : null}</div>]} /> : null}
    {tab === "reports" ? <div className="grid gap-4 lg:grid-cols-2"><DataTable title="Recent Sales" rows={sales.slice(0, 20)} columns={["Receipt", "Date", "Customer", "Total", "Status"]} render={(s) => [s.documentNo, s.saleDate ? new Date(s.saleDate).toLocaleString() : "-", s.customer?.partyName, money(s.totals?.grandTotal), statusBadge(s.status)]} /><DataTable title="Products Ready for POS" rows={products.slice(0, 20)} columns={["Product", "Barcode", "Price", "Stock"]} render={(p) => [productLabel(p), p.barcode || p.sku || p.code, money(p.retailPrice || p.customerPrice || p.tradePrice), Number(p.availableQty || 0).toLocaleString()]} /></div> : null}
  </div>;
}

function DataTable({ title, rows = [], columns = [], render }) {
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><button onClick={() => exportCsv(`${title.toLowerCase().replaceAll(" ", "-")}.csv`, rows)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Export CSV</button></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={recordId(row) || idx} className="border-t border-slate-100 align-top">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>;
}
