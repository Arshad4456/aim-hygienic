"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { v2Api } from "../../../lib/api";
import { getAuthSnapshot } from "../../../lib/clientAuth";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import StatusBadge from "../../../components/foundation/StatusBadge";

const SECTION_ITEMS = [
  { key: "overview", title: "Warehouse Dashboard", description: "Control tower for inbound, outbound, dispatch readiness, and stock risk." },
  { key: "stock-summary", title: "Company Stock Summary", description: "Warehouse-level stock visibility built from the V2 inventory ledger." },
  { key: "inward-outward", title: "Inward / Outward", description: "Recent stock movements, separated into inbound and outbound execution." },
  { key: "goods-receipts", title: "Goods Receipt Verification", description: "Purchase receipt visibility for warehouse verification and follow-up." },
  { key: "dispatch-preparation", title: "Company Dispatch Preparation", description: "Prepare and post dispatch notes against approved company supply orders." },
  { key: "stock-adjustment", title: "Stock Adjustment", description: "Adjustment visibility for shrinkage, manual corrections, and operational controls." },
  { key: "damage-expiry", title: "Damage & Expiry", description: "Track low stock, expiry risk, and damage/expiry ledger impact." },
];

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function buildStockSummary(rows = [], scopedWarehouseId = "") {
  const filtered = (rows || []).filter((row) => String(row?.ownerType || "") === "company");
  const map = new Map();

  filtered.forEach((row) => {
    const warehouseId = String(row?.warehouseId || row?.warehouseName || "").trim();
    if (scopedWarehouseId && warehouseId && warehouseId !== scopedWarehouseId) return;
    const key = [row?.warehouseName || row?.warehouseId || "Unassigned", row?.productName || row?.productCode || row?.productId || "Unknown"].join("::");
    const entry = map.get(key) || {
      _id: key,
      warehouseName: row?.warehouseName || row?.warehouseId || "Unassigned",
      productName: row?.productName || row?.productCode || row?.productId || "Unknown",
      inboundQty: 0,
      outboundQty: 0,
      closingQty: 0,
      totalValue: 0,
      lastPostedAt: row?.postedAt || row?.createdAt,
    };
    const qty = safeNumber(row?.qty);
    if (String(row?.direction || "").toLowerCase() === "in") entry.inboundQty += qty;
    else entry.outboundQty += qty;
    entry.closingQty = entry.inboundQty - entry.outboundQty;
    entry.totalValue += safeNumber(row?.totalValue);
    const candidateDate = new Date(row?.postedAt || row?.createdAt || 0).getTime();
    const currentDate = new Date(entry.lastPostedAt || 0).getTime();
    if (candidateDate > currentDate) entry.lastPostedAt = row?.postedAt || row?.createdAt;
    map.set(key, entry);
  });

  return [...map.values()].sort((a, b) => b.closingQty - a.closingQty);
}

function normalizeOrders(response) {
  return Array.isArray(response?.orders) ? response.orders : [];
}

function normalizeRows(response) {
  return Array.isArray(response?.rows) ? response.rows : [];
}

function normalizeInventoryReport(response) {
  return response?.module || response || {};
}

function buildDispatchPayload(order, draft, warehouses) {
  const warehouseSnapshot = order?.dispatchFromWarehouse || order?.receiveAtWarehouse || warehouses?.[0];
  const normalizedWarehouse = warehouseSnapshot
    ? {
        partyType: warehouseSnapshot.partyType || "warehouse",
        partyId: String(warehouseSnapshot.partyId || warehouseSnapshot._id || warehouseSnapshot.warehouseId || ""),
        partyName: warehouseSnapshot.partyName || warehouseSnapshot.name || warehouseSnapshot.warehouseName || "Warehouse",
      }
    : { partyType: "warehouse", partyId: "", partyName: "Warehouse" };

  return {
    documentNo: draft.documentNo,
    companySalesOrderId: order?._id,
    distributorId: order?.distributorId,
    dispatchFromWarehouse: normalizedWarehouse,
    transporter: {
      partyType: "transporter",
      partyId: draft.vehicleId || "warehouse-team",
      partyName: draft.vehicleId ? `Vehicle ${draft.vehicleId}` : "Warehouse Team",
    },
    vehicleId: draft.vehicleId,
    driverUserId: draft.driverUserId,
    notes: draft.notes,
    lines: (order?.lines || []).map((line, index) => ({
      lineNo: line?.lineNo || index + 1,
      productId: line?.productId || "",
      productCode: line?.productCode || "",
      productName: line?.productName || "Unnamed product",
      qty: safeNumber(line?.qty),
      dispatchedQty: safeNumber(line?.dispatchedQty || line?.qty),
      unitCost: safeNumber(line?.unitCost),
      batchNo: line?.batchNo || "",
    })),
  };
}

export default function WarehouseManagerWorkspace({ initialSection = "overview" }) {
  const auth = useMemo(() => getAuthSnapshot(), []);
  const scopedWarehouseId = String(auth?.user?.warehouseId || auth?.user?.warehouse_id || auth?.payload?.warehouseId || "").trim();

  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [companyOrders, setCompanyOrders] = useState([]);
  const [dispatchRows, setDispatchRows] = useState([]);
  const [lowStockRows, setLowStockRows] = useState([]);
  const [nearExpiryRows, setNearExpiryRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [submittingDispatch, setSubmittingDispatch] = useState(false);
  const [dispatchMessage, setDispatchMessage] = useState("");
  const [dispatchDraft, setDispatchDraft] = useState({
    orderId: "",
    documentNo: `CDN-WM-${Date.now()}`,
    vehicleId: "",
    driverUserId: "",
    notes: "",
  });

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const responses = await Promise.allSettled([
          v2Api.warehouseManager.overview(),
          v2Api.warehouseManager.inventoryReport(),
          v2Api.warehouseManager.ledger({ ownerType: "company" }),
          v2Api.warehouseManager.listCompanySupplyOrders({ status: "all" }),
          v2Api.warehouseManager.listCompanyDispatches({ status: "all" }),
          v2Api.warehouseManager.lowStock(),
          v2Api.warehouseManager.nearExpiry(),
          v2Api.warehouseManager.listWarehouses(),
        ]);
        if (!mounted) return;
        const [overviewRes, inventoryRes, ledgerRes, orderRes, dispatchRes, lowStockRes, nearExpiryRes, warehouseRes] = responses;
        if (overviewRes.status === "fulfilled") setReport(overviewRes.value || null);
        if (inventoryRes.status === "fulfilled") setInventoryReport(normalizeInventoryReport(inventoryRes.value));
        if (ledgerRes.status === "fulfilled") setLedgerRows(normalizeRows(ledgerRes.value));
        if (orderRes.status === "fulfilled") setCompanyOrders(normalizeOrders(orderRes.value));
        if (dispatchRes.status === "fulfilled") setDispatchRows(normalizeRows(dispatchRes.value));
        if (lowStockRes.status === "fulfilled") setLowStockRows(Array.isArray(lowStockRes.value?.rows) ? lowStockRes.value.rows : Array.isArray(lowStockRes.value?.items) ? lowStockRes.value.items : []);
        if (nearExpiryRes.status === "fulfilled") setNearExpiryRows(Array.isArray(nearExpiryRes.value?.rows) ? nearExpiryRes.value.rows : Array.isArray(nearExpiryRes.value?.products) ? nearExpiryRes.value.products : []);
        if (warehouseRes.status === "fulfilled") setWarehouses(Array.isArray(warehouseRes.value?.warehouses) ? warehouseRes.value.warehouses : []);

        const failure = responses.find((entry) => entry.status === "rejected");
        if (failure) setError(failure.reason?.message || "Some warehouse signals could not be loaded.");
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load warehouse workspace");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const scopedLedgerRows = useMemo(() => {
    if (!scopedWarehouseId) return ledgerRows;
    return ledgerRows.filter((row) => String(row?.warehouseId || "").trim() === scopedWarehouseId);
  }, [ledgerRows, scopedWarehouseId]);

  const stockSummaryRows = useMemo(() => buildStockSummary(scopedLedgerRows, scopedWarehouseId).slice(0, 20), [scopedLedgerRows, scopedWarehouseId]);
  const inboundRows = useMemo(() => scopedLedgerRows.filter((row) => String(row?.direction || "").toLowerCase() === "in").slice(0, 12), [scopedLedgerRows]);
  const outboundRows = useMemo(() => scopedLedgerRows.filter((row) => String(row?.direction || "").toLowerCase() === "out").slice(0, 12), [scopedLedgerRows]);
  const goodsReceiptRows = useMemo(() => scopedLedgerRows.filter((row) => String(row?.movementType || "").toLowerCase() === "purchase_receipt").slice(0, 12), [scopedLedgerRows]);
  const adjustmentRows = useMemo(() => scopedLedgerRows.filter((row) => ["adjustment_in", "adjustment_out"].includes(String(row?.movementType || "").toLowerCase())).slice(0, 12), [scopedLedgerRows]);
  const damageExpiryLedgerRows = useMemo(() => scopedLedgerRows.filter((row) => ["damage_out", "expiry_out"].includes(String(row?.movementType || "").toLowerCase())).slice(0, 12), [scopedLedgerRows]);
  const dispatchReadyOrders = useMemo(() => companyOrders.filter((row) => ["approved", "reserved", "ready_to_dispatch"].includes(String(row?.status || "").toLowerCase())).slice(0, 12), [companyOrders]);
  const selectedOrder = useMemo(() => dispatchReadyOrders.find((row) => String(row?._id) === String(dispatchDraft.orderId)) || null, [dispatchReadyOrders, dispatchDraft.orderId]);

  const overviewCards = useMemo(() => {
    const inboundQty = inboundRows.reduce((sum, row) => sum + safeNumber(row?.qty), 0);
    const outboundQty = outboundRows.reduce((sum, row) => sum + safeNumber(row?.qty), 0);
    return [
      { label: "Warehouse On Hand", value: Number(stockSummaryRows.reduce((sum, row) => sum + safeNumber(row?.closingQty), 0)).toLocaleString(), helper: `${stockSummaryRows.length} active stock lines` },
      { label: "Inbound Captured", value: inboundQty.toLocaleString(), helper: `${goodsReceiptRows.length} receipt ledger rows` },
      { label: "Outbound Captured", value: outboundQty.toLocaleString(), helper: `${dispatchRows.length} dispatch notes in V2` },
      { label: "Dispatch Ready", value: dispatchReadyOrders.length, helper: "Approved company supply orders" },
      { label: "Low Stock Alerts", value: lowStockRows.length, helper: "Items needing replenishment review" },
      { label: "Damage / Expiry", value: nearExpiryRows.length + damageExpiryLedgerRows.length, helper: "Expiry risk + posted shrinkage" },
    ];
  }, [damageExpiryLedgerRows.length, dispatchReadyOrders.length, dispatchRows.length, goodsReceiptRows.length, inboundRows, lowStockRows.length, nearExpiryRows.length, outboundRows, stockSummaryRows]);

  async function handleCreateDispatch(shouldPost) {
    if (!selectedOrder) {
      setDispatchMessage("Select a company supply order first.");
      return;
    }
    setSubmittingDispatch(true);
    setDispatchMessage("");
    try {
      const payload = buildDispatchPayload(selectedOrder, dispatchDraft, warehouses);
      const created = await v2Api.warehouseManager.createCompanyDispatch(payload);
      const draftDoc = created?.dispatch;
      if (shouldPost && draftDoc?._id) {
        await v2Api.warehouseManager.postCompanyDispatch(draftDoc._id);
      }
      const [dispatchRes, ledgerRes] = await Promise.all([
        v2Api.warehouseManager.listCompanyDispatches({ status: "all" }),
        v2Api.warehouseManager.ledger({ ownerType: "company" }),
      ]);
      setDispatchRows(normalizeRows(dispatchRes));
      setLedgerRows(normalizeRows(ledgerRes));
      setDispatchMessage(shouldPost ? "Dispatch created and posted successfully." : "Dispatch draft created successfully.");
      setDispatchDraft((prev) => ({ ...prev, documentNo: `CDN-WM-${Date.now()}`, notes: "" }));
    } catch (err) {
      setDispatchMessage(err.message || "Failed to create dispatch.");
    } finally {
      setSubmittingDispatch(false);
    }
  }

  const content = useMemo(() => {
    if (loading) {
      return <EmptyState title="Loading warehouse workspace" description="Fetching warehouse stock, dispatch, and receipt signals from the V2 backend." />;
    }

    if (activeSection.key === "overview") {
      return (
        <div className="space-y-5">
          <SectionCard title="Warehouse command center" description="Monitor warehouse flow, dispatch readiness, and stock risk from one V2-first workspace.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overviewCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{card.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-950">{card.value}</div>
                  <div className="mt-2 text-sm text-zinc-600">{card.helper}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Operations health" description="Warehouse-relevant operational KPIs from the shared V2 operations service.">
              <div className="grid gap-3 md:grid-cols-2">
                {(report?.serviceHealth || []).map((item) => (
                  <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                    <div className="mt-2 text-3xl font-semibold text-zinc-950">{safeNumber(item.value).toLocaleString()}%</div>
                    <div className="mt-1 text-sm text-zinc-600">{item.note}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Warehouse alerts" description="Immediate follow-up items surfaced through dispatch and inventory monitoring.">
              <div className="space-y-3">
                {(report?.alerts || []).map((alert, index) => (
                  <div key={`${alert?.title || 'alert'}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-zinc-900">{alert?.title || 'Operational alert'}</div>
                      <StatusBadge value={alert?.tone || 'info'} tone={alert?.tone || 'info'} />
                    </div>
                    <div className="mt-2 text-sm text-zinc-600">{alert?.detail || 'No detail available.'}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      );
    }

    if (activeSection.key === "stock-summary") {
      return (
        <SectionCard title="Company stock summary" description="Stock-on-hand is calculated from posted inventory ledger movement grouped by warehouse and product.">
          <DocumentTable
            rows={stockSummaryRows}
            columns={[
              { key: "warehouseName", title: "Warehouse" },
              { key: "productName", title: "Product" },
              { key: "inboundQty", title: "Inbound", render: (row) => safeNumber(row?.inboundQty).toLocaleString() },
              { key: "outboundQty", title: "Outbound", render: (row) => safeNumber(row?.outboundQty).toLocaleString() },
              { key: "closingQty", title: "On hand", render: (row) => safeNumber(row?.closingQty).toLocaleString() },
              { key: "lastPostedAt", title: "Last movement", render: (row) => formatDate(row?.lastPostedAt) },
            ]}
            emptyTitle="No stock summary available"
            emptyDescription="Once the warehouse has posted inbound or outbound V2 inventory movement, the stock summary will appear here."
          />
        </SectionCard>
      );
    }

    if (activeSection.key === "inward-outward") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Inbound movements" description="Recent stock movement rows posted into the warehouse as inbound flow.">
            <DocumentTable
              rows={inboundRows}
              columns={[
                { key: "referenceNo", title: "Reference" },
                { key: "productName", title: "Product" },
                { key: "movementType", title: "Movement", type: "status" },
                { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
                { key: "postedAt", title: "Posted", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
              ]}
              emptyTitle="No inbound movement"
              emptyDescription="Inbound ledger rows will appear here once goods receipts or transfer-ins are posted."
            />
          </SectionCard>

          <SectionCard title="Outbound movements" description="Recent dispatch and shrinkage-related stock movement leaving the warehouse.">
            <DocumentTable
              rows={outboundRows}
              columns={[
                { key: "referenceNo", title: "Reference" },
                { key: "productName", title: "Product" },
                { key: "movementType", title: "Movement", type: "status" },
                { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
                { key: "postedAt", title: "Posted", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
              ]}
              emptyTitle="No outbound movement"
              emptyDescription="Outbound ledger rows will appear here after dispatch posting or warehouse adjustments."
            />
          </SectionCard>
        </div>
      );
    }

    if (activeSection.key === "goods-receipts") {
      return (
        <SectionCard title="Goods receipt verification" description="Use this queue to confirm which purchase receipts have already landed in the warehouse ledger.">
          <DocumentTable
            rows={goodsReceiptRows}
            columns={[
              { key: "referenceNo", title: "Receipt ref" },
              { key: "warehouseName", title: "Warehouse" },
              { key: "productName", title: "Product" },
              { key: "batchNo", title: "Batch" },
              { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
              { key: "postedAt", title: "Verified at", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
            ]}
            emptyTitle="No goods receipts found"
            emptyDescription="Purchase receipt rows will appear once procurement postings hit the V2 inventory ledger."
          />
        </SectionCard>
      );
    }

    if (activeSection.key === "dispatch-preparation") {
      return (
        <div className="space-y-5">
          <SectionCard title="Create company dispatch" description="Create a dispatch note directly from an approved company supply order, then post it into the V2 ledger.">
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-zinc-700">
                  Company supply order
                  <select
                    value={dispatchDraft.orderId}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, orderId: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select approved order…</option>
                    {dispatchReadyOrders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order.documentNo || order._id} · {order?.distributor?.partyName || order?.distributorId || "Distributor"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-zinc-700">
                  Dispatch document number
                  <input
                    value={dispatchDraft.documentNo}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, documentNo: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="CDN-WM-001"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Vehicle ID
                    <input
                      value={dispatchDraft.vehicleId}
                      onChange={(event) => setDispatchDraft((prev) => ({ ...prev, vehicleId: event.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="Optional"
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700">
                    Driver user ID
                    <input
                      value={dispatchDraft.driverUserId}
                      onChange={(event) => setDispatchDraft((prev) => ({ ...prev, driverUserId: event.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-zinc-700">
                  Warehouse note
                  <textarea
                    value={dispatchDraft.notes}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, notes: event.target.value }))}
                    className="mt-1 min-h-[96px] w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="Packing, route, or handling note"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={submittingDispatch}
                    onClick={() => handleCreateDispatch(false)}
                    className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {submittingDispatch ? "Saving…" : "Create draft dispatch"}
                  </button>
                  <button
                    type="button"
                    disabled={submittingDispatch}
                    onClick={() => handleCreateDispatch(true)}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {submittingDispatch ? "Posting…" : "Create & post"}
                  </button>
                </div>
                {dispatchMessage ? <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{dispatchMessage}</div> : null}
              </div>

              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-base font-semibold text-zinc-900">Selected order preview</div>
                {selectedOrder ? (
                  <div className="mt-4 space-y-3 text-sm text-zinc-700">
                    <div><span className="font-medium text-zinc-900">Order:</span> {selectedOrder.documentNo || selectedOrder._id}</div>
                    <div><span className="font-medium text-zinc-900">Distributor:</span> {selectedOrder?.distributor?.partyName || selectedOrder?.distributorId || "-"}</div>
                    <div><span className="font-medium text-zinc-900">Warehouse:</span> {selectedOrder?.dispatchFromWarehouse?.partyName || selectedOrder?.receiveAtWarehouse?.partyName || "Warehouse pending"}</div>
                    <div><span className="font-medium text-zinc-900">Status:</span> <StatusBadge value={selectedOrder?.status || "-"} tone={selectedOrder?.status || "info"} className="ml-2" /></div>
                    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                      <div className="mb-2 text-sm font-semibold text-zinc-900">Line items</div>
                      <div className="space-y-2">
                        {(selectedOrder?.lines || []).map((line, index) => (
                          <div key={`${line?.productId || line?.productName || 'line'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2">
                            <div>
                              <div className="font-medium text-zinc-900">{line?.productName || "Unnamed product"}</div>
                              <div className="text-xs text-zinc-500">{line?.productCode || line?.productId || "No code"}</div>
                            </div>
                            <div className="text-sm font-semibold text-zinc-900">{safeNumber(line?.qty).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-zinc-600">Select an approved company supply order to prepare dispatch from this warehouse.</div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Recent dispatch notes" description="Track dispatch notes already created from the warehouse panel or procurement flow.">
            <DocumentTable
              rows={dispatchRows.slice(0, 12)}
              columns={[
                { key: "documentNo", title: "Dispatch" },
                { key: "distributorId", title: "Distributor", render: (row) => row?.distributorId || "-" },
                { key: "status", title: "Status", type: "status" },
                { key: "dispatchFromWarehouse", title: "Warehouse", render: (row) => row?.dispatchFromWarehouse?.partyName || "-" },
                { key: "dispatchedAt", title: "Dispatch time", render: (row) => formatDate(row?.dispatchedAt || row?.createdAt) },
              ]}
              emptyTitle="No dispatch notes yet"
              emptyDescription="Create a company dispatch from an approved order to start the outbound warehouse flow."
            />
          </SectionCard>
        </div>
      );
    }

    if (activeSection.key === "stock-adjustment") {
      return (
        <div className="space-y-5">
          <SectionCard title="Adjustment visibility" description="Warehouse adjustments are tracked through dedicated V2 ledger movement types so you can audit corrections and shrinkage separately from sales flow.">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Adjustment rows</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-950">{adjustmentRows.length}</div>
                <div className="mt-2 text-sm text-zinc-600">Posted manual correction or reconciliation entries.</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Low stock lines</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-950">{lowStockRows.length}</div>
                <div className="mt-2 text-sm text-zinc-600">Potential candidates for cycle counting and stock check.</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Warehouse scope</div>
                <div className="mt-2 text-base font-semibold text-zinc-950">{scopedWarehouseId || "All company warehouses"}</div>
                <div className="mt-2 text-sm text-zinc-600">This panel respects the warehouse manager assignment from the auth token.</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Adjustment history" description="Latest adjustment rows already posted in the V2 inventory ledger.">
            <DocumentTable
              rows={adjustmentRows}
              columns={[
                { key: "referenceNo", title: "Reference" },
                { key: "productName", title: "Product" },
                { key: "movementType", title: "Type", type: "status" },
                { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
                { key: "postedAt", title: "Posted", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
              ]}
              emptyTitle="No stock adjustments posted"
              emptyDescription="Once adjustment workflows start posting to the V2 ledger, the audit history will appear here."
            />
          </SectionCard>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <SectionCard title="Damage & expiry visibility" description="Monitor stock at risk and posted shrinkage so warehouse action happens before losses increase.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Near expiry lines</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{nearExpiryRows.length}</div>
              <div className="mt-2 text-sm text-zinc-600">Items approaching expiry based on current inventory monitoring.</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Damage / expiry posts</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{damageExpiryLedgerRows.length}</div>
              <div className="mt-2 text-sm text-zinc-600">Ledger rows already posted as damage or expiry adjustments.</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Low stock</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-950">{lowStockRows.length}</div>
              <div className="mt-2 text-sm text-zinc-600">Low stock lines help prioritize replenishment with expiry review.</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Warehouse report</div>
              <div className="mt-2 text-base font-semibold text-zinc-950">{inventoryReport?.title || "Inventory report ready"}</div>
              <div className="mt-2 text-sm text-zinc-600">Live report module summary from the V2 reporting layer.</div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Near expiry products" description="Products at risk of expiry based on current inventory reporting.">
            <DocumentTable
              rows={nearExpiryRows.slice(0, 12)}
              columns={[
                { key: "productName", title: "Product", render: (row) => row?.productName || row?.name || row?.product || "-" },
                { key: "warehouseName", title: "Warehouse", render: (row) => row?.warehouseName || row?.warehouse || "-" },
                { key: "quantity", title: "Qty", render: (row) => safeNumber(row?.quantity || row?.qty).toLocaleString() },
                { key: "expiryDate", title: "Expiry", render: (row) => formatDate(row?.expiryDate) },
              ]}
              emptyTitle="No near-expiry products"
              emptyDescription="No near-expiry items are currently being returned by the warehouse monitoring API."
            />
          </SectionCard>

          <SectionCard title="Damage / expiry ledger" description="Posted warehouse loss rows already pushed into the V2 inventory ledger.">
            <DocumentTable
              rows={damageExpiryLedgerRows}
              columns={[
                { key: "referenceNo", title: "Reference" },
                { key: "productName", title: "Product" },
                { key: "movementType", title: "Type", type: "status" },
                { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
                { key: "postedAt", title: "Posted", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
              ]}
              emptyTitle="No damage or expiry posting"
              emptyDescription="Warehouse damage/expiry postings will appear here once they are recorded in V2."
            />
          </SectionCard>
        </div>
      </div>
    );
  }, [activeSection.key, adjustmentRows, companyOrders, damageExpiryLedgerRows, dispatchDraft, dispatchMessage, dispatchReadyOrders, dispatchRows, error, goodsReceiptRows, inboundRows, inventoryReport, loading, lowStockRows, nearExpiryRows, outboundRows, overviewCards, report, scopedLedgerRows, scopedWarehouseId, selectedOrder, stockSummaryRows, submittingDispatch, warehouses]);

  return (
    <UserDashboardShell
      title="Warehouse Manager Dashboard"
      subtitle="Warehouse-scoped stock control, receipt verification, and dispatch preparation."
      roleKey="Warehouse Manager"
      links={userDashboardSearchItems.warehouseManager || []}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Warehouse operations"
          title="Warehouse Manager command center"
          description="This V2-first warehouse workspace gives the warehouse manager a focused view of company stock, inbound receipts, outbound dispatch readiness, and stock risk."
          actions={
            <>
              <Link href="/dashboards/warehouseManager/goods-receipts" className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-emerald-300 hover:text-emerald-700">
                Review goods receipts
              </Link>
              <Link href="/dashboards/warehouseManager/dispatch-preparation" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Prepare dispatch
              </Link>
            </>
          }
        />

        {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

        <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={(item) => setActiveSection(item)} />
        {content}
      </div>
    </UserDashboardShell>
  );
}
