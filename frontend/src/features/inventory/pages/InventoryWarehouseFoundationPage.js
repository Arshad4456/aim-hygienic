"use client";
import { useEffect, useState } from "react";
import inventoryService from "../../../services/inventoryService";

function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function num(value) { return Number(value || 0).toLocaleString(); }
function dateText(value) { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(); }

export default function InventoryWarehouseFoundationPage({ mode = "inventory" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventory, setInventory] = useState({ kpis: {}, summary: [] });
  const [warehouse, setWarehouse] = useState({ kpis: {}, warehouses: [], draftReceipts: [], postedReceipts: [], ledgerRows: [] });
  const isWarehouse = mode === "warehouse";

  async function load() {
    setLoading(true); setError("");
    try {
      const [inventoryPayload, warehousePayload] = await Promise.all([inventoryService.overview(), inventoryService.warehouseOverview()]);
      setInventory({ kpis: inventoryPayload?.kpis || {}, summary: inventoryPayload?.summary || [] });
      setWarehouse({ kpis: warehousePayload?.kpis || {}, warehouses: warehousePayload?.warehouses || [], draftReceipts: warehousePayload?.draftReceipts || [], postedReceipts: warehousePayload?.postedReceipts || [], ledgerRows: warehousePayload?.ledgerRows || [] });
    } catch (e) { setError(e.message || "Unable to load inventory foundation"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return <div className="space-y-5">
    <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-700 to-emerald-500 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.24em] opacity-90">Phase 5 Inventory & Warehouse</p>
      <h2 className="mt-2 text-3xl font-black">{isWarehouse ? "Warehouse Control" : "Inventory Control"}</h2>
      <p className="mt-2 max-w-3xl text-sm text-cyan-50">Posted GRNs now create inventory ledger entries. Stock summary is calculated from in/out movements instead of editable static totals.</p>
    </div>
    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading inventory data…</div> : null}
    {!loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["Stock Qty", num(inventory.kpis.totalQty), "Current company stock balance"],
      ["Stock Value", money(inventory.kpis.totalValue), "Valuation from posted movements"],
      ["Posted GRNs", num(inventory.kpis.postedReceipts), "Receipts posted to ledger"],
      ["Draft GRNs", num(inventory.kpis.draftReceipts), "Waiting for posting"],
    ].map(([label, value, help]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-slate-950">{value}</p><p className="mt-2 text-sm text-slate-500">{help}</p></div>)}</div> : null}
    {!loading && isWarehouse ? <div className="grid gap-5 xl:grid-cols-2"><Table title="Warehouses" rows={warehouse.warehouses} columns={["Warehouse", "City", "Status"]} render={(row) => [row.name || row.warehouseName || row.warehouseId || "Main Warehouse", row.city || "-", row.status || "active"]} /><Table title="Draft Goods Receipts" rows={warehouse.draftReceipts} columns={["GRN", "PO", "Supplier", "Status"]} render={(row) => [row.documentNo, row.purchaseOrderNo || "-", row.supplier?.partyName || "-", row.status]} /></div> : null}
    {!loading ? <Table title="Stock Summary" rows={inventory.summary} columns={["Warehouse", "Product", "In", "Out", "Balance", "Value"]} render={(row) => [row.warehouseName || row.warehouseId || "Main Warehouse", row.productName || "-", num(row.inQty), num(row.outQty), num(row.balanceQty), money(row.stockValue)]} /> : null}
    {!loading ? <Table title="Recent Inventory Ledger" rows={warehouse.ledgerRows || []} columns={["Date", "Movement", "Product", "Qty", "Reference"]} render={(row) => [dateText(row.postedAt || row.createdAt), row.movementType, row.productName, `${row.direction === "out" ? "-" : "+"}${num(row.qty)}`, row.referenceNo || "-"]} /> : null}
  </div>;
}

function Table({ title, rows = [], columns = [], render }) { return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row._id || `${row.productName}-${idx}`} className="border-t border-slate-100">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>; }
