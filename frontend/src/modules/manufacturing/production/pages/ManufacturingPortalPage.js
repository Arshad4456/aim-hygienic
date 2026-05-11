"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "@/src/services/apiClient";

const tabs = [["overview", "Overview"], ["bom", "BOM"], ["production", "Production Orders"], ["quality", "Quality"], ["maintenance", "Maintenance"], ["costing", "Costing"]];
const emptyMaterial = { productId: "", productName: "", qty: 1, unitCost: 0 };
function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function idOf(row = {}) { return String(row._id || row.id || row.documentNo || row.bomNo || ""); }
function productName(p = {}) { return p.name || p.productName || p.finishedProductName || p.code || "Product"; }
function statusBadge(status) { const s = String(status || "planned"); const color = s.includes("complete") || s.includes("active") || s.includes("passed") ? "bg-emerald-50 text-emerald-700" : s.includes("quality") || s.includes("partial") || s.includes("scheduled") ? "bg-amber-50 text-amber-700" : s.includes("cancel") || s.includes("failed") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"; return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{s}</span>; }
function exportCsv(filename, rows = []) { const cols = Object.keys(rows[0] || { empty: "" }); const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function printPayload(title, payload) { const w = window.open("", "_blank"); if (!w) return; w.document.write(`<html><head><title>${title}</title><style>body{font-family:Arial;padding:24px;color:#111827}pre{white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:16px}.brand{font-size:20px;font-weight:800}</style></head><body><div class="brand">Rawyan ERP</div><h1>${title}</h1><pre>${JSON.stringify(payload, null, 2)}</pre><script>window.print()</script></body></html>`); w.document.close(); }

export default function ManufacturingPortalPage() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState({});
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [boms, setBoms] = useState([]);
  const [orders, setOrders] = useState([]);
  const [qualityChecks, setQualityChecks] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bomForm, setBomForm] = useState({ finishedProductId: "", outputQty: 1, laborCost: 0, overheadCost: 0, materials: [{ ...emptyMaterial }] });
  const [orderForm, setOrderForm] = useState({ bomId: "", plannedQty: 1, rawMaterialWarehouseId: "", finishedGoodsWarehouseId: "", dueDate: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({ machineName: "", workCenter: "", maintenanceType: "preventive", dueDate: "", technicianName: "", cost: 0 });

  async function load() {
    setLoading(true); setError("");
    try {
      const [ov, pr, wh, bm, po, qc, mt] = await Promise.all([
        apiClient("/manufacturing/overview"),
        apiClient("/manufacturing/products"),
        apiClient("/manufacturing/warehouses"),
        apiClient("/manufacturing/boms"),
        apiClient("/manufacturing/production-orders"),
        apiClient("/manufacturing/quality-checks"),
        apiClient("/manufacturing/maintenance"),
      ]);
      setOverview(ov || {}); setProducts(pr?.products || []); setWarehouses(wh?.warehouses || []); setBoms(bm?.boms || []); setOrders(po?.productionOrders || []); setQualityChecks(qc?.qualityChecks || []); setMaintenance(mt?.maintenance || []);
    } catch (err) { setError(err?.message || "Unable to load Manufacturing module."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const materialTotal = useMemo(() => bomForm.materials.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitCost || 0), 0), [bomForm.materials]);

  function setBomLine(index, key, value) {
    const materials = bomForm.materials.map((line, i) => i === index ? { ...line, [key]: value } : line);
    if (key === "productId") {
      const product = products.find((p) => String(p.productId || p._id || p.code || p.sku) === String(value));
      materials[index] = { ...materials[index], productName: productName(product), unitCost: product?.costPrice || product?.tradePrice || 0 };
    }
    setBomForm({ ...bomForm, materials });
  }

  async function onCreateBom() {
    setSaving(true); setError(""); setNotice("");
    try { await apiClient("/manufacturing/boms", { method: "POST", body: bomForm }); setNotice("BOM created with raw materials and estimated costing."); setBomForm({ finishedProductId: "", outputQty: 1, laborCost: 0, overheadCost: 0, materials: [{ ...emptyMaterial }] }); await load(); }
    catch (err) { setError(err?.message || "Unable to create BOM."); }
    finally { setSaving(false); }
  }

  async function onCreateOrder() {
    setSaving(true); setError(""); setNotice("");
    try { await apiClient("/manufacturing/production-orders", { method: "POST", body: orderForm }); setNotice("Production order planned from BOM."); setOrderForm({ bomId: "", plannedQty: 1, rawMaterialWarehouseId: "", finishedGoodsWarehouseId: "", dueDate: "" }); await load(); }
    catch (err) { setError(err?.message || "Unable to create production order."); }
    finally { setSaving(false); }
  }

  async function actionOrder(order, action) {
    setSaving(true); setError(""); setNotice("");
    try {
      const body = action === "receive-finished-goods" ? { producedQty: order.plannedQty, rejectedQty: 0, scrapQty: 0 } : {};
      await apiClient(`/manufacturing/production-orders/${idOf(order)}/${action}`, { method: "POST", body });
      setNotice(action === "issue-materials" ? "Raw materials issued and stock reduced." : "Finished goods received and stock increased.");
      await load();
    } catch (err) { setError(err?.message || "Production order action failed."); }
    finally { setSaving(false); }
  }

  async function onQuality(order) {
    const rejectedQty = window.prompt("Rejected quantity", "0");
    if (rejectedQty === null) return;
    setSaving(true); setError(""); setNotice("");
    try { await apiClient(`/manufacturing/production-orders/${idOf(order)}/quality-check`, { method: "POST", body: { checkedQty: order.producedQty || order.plannedQty, rejectedQty } }); setNotice("Quality check recorded."); await load(); }
    catch (err) { setError(err?.message || "Unable to record QC."); }
    finally { setSaving(false); }
  }

  async function onCreateMaintenance() {
    setSaving(true); setError(""); setNotice("");
    try { await apiClient("/manufacturing/maintenance", { method: "POST", body: maintenanceForm }); setNotice("Machine maintenance record created."); setMaintenanceForm({ machineName: "", workCenter: "", maintenanceType: "preventive", dueDate: "", technicianName: "", cost: 0 }); await load(); }
    catch (err) { setError(err?.message || "Unable to create maintenance record."); }
    finally { setSaving(false); }
  }

  async function onPrint(type, id, title) {
    try { const payload = await apiClient(`/manufacturing/print/${type}/${id}`); printPayload(title, payload); }
    catch (err) { setError(err?.message || "Unable to print document."); }
  }

  const kpis = overview?.kpis || {};
  return <div className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">Phase 7 Complete Module</p><div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-3xl font-black text-slate-950">Manufacturing ERP</h2><p className="mt-2 max-w-4xl text-sm text-slate-600">BOM, production planning, raw material issue, finished goods receiving, WIP status, quality check, machine maintenance, and manufacturing cost control.</p></div><button onClick={load} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Refresh</button></div></div>
    {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
    {notice ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{[{ label: "Active BOMs", value: kpis.bomCount || 0 }, { label: "Open Production", value: kpis.openOrders || 0 }, { label: "Completed", value: kpis.completedOrders || 0 }, { label: "QC Attention", value: kpis.qcPending || 0 }, { label: "Maintenance Due", value: kpis.maintenanceDue || 0 }].map((item) => <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p><p className="mt-3 text-2xl font-black text-slate-950">{item.value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-black ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{label}</button>)}</div>
    {loading ? <div className="rounded-3xl bg-white p-6 text-sm text-slate-500">Loading Manufacturing…</div> : null}

    {tab === "overview" ? <div className="grid gap-4 lg:grid-cols-3"><Workflow title="Plan" description="Create BOMs and production orders from demand or sales forecast." /><Workflow title="Produce" description="Issue raw materials from warehouse, monitor WIP, and receive finished goods." /><Workflow title="Control" description="Record quality checks, scrap, rejects, machine maintenance, and print production documents." /></div> : null}

    {tab === "bom" ? <div className="grid gap-6 xl:grid-cols-[420px_1fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">Create BOM</h3><div className="mt-4 space-y-3"><select value={bomForm.finishedProductId} onChange={(e) => setBomForm({ ...bomForm, finishedProductId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Finished product</option>{products.map((p) => <option key={p._id || p.productId || p.code} value={p.productId || p._id || p.code}>{productName(p)}</option>)}</select><input value={bomForm.outputQty} onChange={(e) => setBomForm({ ...bomForm, outputQty: e.target.value })} type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Output quantity" /><div className="grid gap-2 md:grid-cols-2"><input value={bomForm.laborCost} onChange={(e) => setBomForm({ ...bomForm, laborCost: e.target.value })} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Labor cost" /><input value={bomForm.overheadCost} onChange={(e) => setBomForm({ ...bomForm, overheadCost: e.target.value })} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Overhead cost" /></div>{bomForm.materials.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_80px_100px_auto]"><select value={line.productId} onChange={(e) => setBomLine(index, "productId", e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Raw material</option>{products.map((p) => <option key={p._id || p.productId || p.code} value={p.productId || p._id || p.code}>{productName(p)}</option>)}</select><input value={line.qty} onChange={(e) => setBomLine(index, "qty", e.target.value)} type="number" min="1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={line.unitCost} onChange={(e) => setBomLine(index, "unitCost", e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button onClick={() => setBomForm({ ...bomForm, materials: bomForm.materials.filter((_, i) => i !== index) })} className="rounded-xl bg-slate-100 px-3 text-xs font-black">Remove</button></div>)}<button onClick={() => setBomForm({ ...bomForm, materials: [...bomForm.materials, { ...emptyMaterial }] })} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">Add Material</button><p className="text-right text-sm font-black text-slate-950">Estimated material cost: {money(materialTotal)}</p><button disabled={saving} onClick={onCreateBom} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Create BOM</button></div></div><DataTable title="Bills of Material" rows={boms} columns={["BOM", "Finished Product", "Output", "Materials", "Cost", "Status", "Action"]} render={(b) => [b.bomNo, b.finishedProductName, `${b.outputQty} ${b.uom || ""}`, b.materials?.length || 0, money(b.estimatedUnitCost), statusBadge(b.status), <button onClick={() => onPrint("bom", idOf(b), "Bill of Material")}>Print</button>]} /></div> : null}

    {tab === "production" ? <div className="grid gap-6 xl:grid-cols-[420px_1fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">Plan Production Order</h3><div className="mt-4 space-y-3"><select value={orderForm.bomId} onChange={(e) => setOrderForm({ ...orderForm, bomId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select BOM</option>{boms.map((b) => <option key={idOf(b)} value={idOf(b)}>{b.bomNo} — {b.finishedProductName}</option>)}</select><input value={orderForm.plannedQty} onChange={(e) => setOrderForm({ ...orderForm, plannedQty: e.target.value })} type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Planned quantity" /><select value={orderForm.rawMaterialWarehouseId} onChange={(e) => setOrderForm({ ...orderForm, rawMaterialWarehouseId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Raw material warehouse</option>{warehouses.map((w) => <option key={w._id || w.warehouseId} value={w.warehouseId || w._id}>{w.name || w.warehouseName}</option>)}</select><select value={orderForm.finishedGoodsWarehouseId} onChange={(e) => setOrderForm({ ...orderForm, finishedGoodsWarehouseId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Finished goods warehouse</option>{warehouses.map((w) => <option key={w._id || w.warehouseId} value={w.warehouseId || w._id}>{w.name || w.warehouseName}</option>)}</select><input value={orderForm.dueDate} onChange={(e) => setOrderForm({ ...orderForm, dueDate: e.target.value })} type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button disabled={saving} onClick={onCreateOrder} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Create Production Order</button></div></div><DataTable title="Production Orders" rows={orders} columns={["Order", "Product", "Planned", "Produced", "Raw WH", "FG WH", "Status", "Actions"]} render={(o) => [o.documentNo, o.finishedProductName, o.plannedQty, o.producedQty || 0, o.rawMaterialWarehouseName, o.finishedGoodsWarehouseName, statusBadge(o.status), <div className="flex flex-wrap gap-2"><button onClick={() => onPrint("production-order", idOf(o), "Production Order")}>Print</button>{o.status === "planned" ? <button onClick={() => actionOrder(o, "issue-materials")}>Issue</button> : null}{["materials_issued", "in_production", "planned"].includes(o.status) ? <button onClick={() => actionOrder(o, "receive-finished-goods")}>Receive FG</button> : null}<button onClick={() => onQuality(o)}>QC</button></div>]} /></div> : null}

    {tab === "quality" ? <DataTable title="Quality Checks" rows={qualityChecks} columns={["QC", "Production", "Product", "Checked", "Passed", "Rejected", "Result", "Action"]} render={(q) => [q.documentNo, q.productionOrderNo, q.productName, q.checkedQty, q.passedQty, q.rejectedQty, statusBadge(q.result), <button onClick={() => onPrint("quality-check", idOf(q), "Quality Check")}>Print</button>]} /> : null}
    {tab === "maintenance" ? <div className="grid gap-6 xl:grid-cols-[380px_1fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">Create Maintenance</h3><div className="mt-4 space-y-3"><input value={maintenanceForm.machineName} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, machineName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Machine name" /><input value={maintenanceForm.workCenter} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, workCenter: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Work center" /><select value={maintenanceForm.maintenanceType} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="preventive">Preventive</option><option value="breakdown">Breakdown</option><option value="calibration">Calibration</option><option value="inspection">Inspection</option></select><input value={maintenanceForm.dueDate} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, dueDate: e.target.value })} type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={maintenanceForm.technicianName} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technicianName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Technician" /><input value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Cost" /><button disabled={saving} onClick={onCreateMaintenance} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Create Maintenance</button></div></div><DataTable title="Machine Maintenance" rows={maintenance} columns={["No", "Machine", "Type", "Due", "Cost", "Status", "Action"]} render={(m) => [m.maintenanceNo, m.machineName, m.maintenanceType, m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "-", money(m.cost), statusBadge(m.status), <button onClick={() => onPrint("maintenance", idOf(m), "Maintenance Record")}>Print</button>]} /></div> : null}
    {tab === "costing" ? <div className="grid gap-4 lg:grid-cols-2"><DataTable title="BOM Costing" rows={boms} columns={["BOM", "Product", "Output", "Unit Cost", "Labor", "Overhead"]} render={(b) => [b.bomNo, b.finishedProductName, b.outputQty, money(b.estimatedUnitCost), money(b.laborCost), money(b.overheadCost)]} /><DataTable title="Production Costing" rows={orders} columns={["Order", "Product", "Estimated", "Actual", "Produced", "Status"]} render={(o) => [o.documentNo, o.finishedProductName, money(o.estimatedCost), money(o.actualCost), o.producedQty || 0, statusBadge(o.status)]} /></div> : null}
  </div>;
}

function Workflow({ title, description }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-500">Workflow</p><h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p></div>; }
function DataTable({ title, rows = [], columns = [], render }) { return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><button onClick={() => exportCsv(`${title.toLowerCase().replaceAll(" ", "-")}.csv`, rows)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Export CSV</button></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={idOf(row) || idx} className="border-t border-slate-100 align-top">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>; }
