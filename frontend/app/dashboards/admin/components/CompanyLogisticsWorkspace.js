"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import StatusBadge from "../../../components/foundation/StatusBadge";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import DocumentViewerModal from "../../../components/foundation/DocumentViewerModal";
import { apiGet, v2Api } from "../../../lib/api";

const SECTION_ITEMS = [
  { key: "overview", title: "Logistics Overview", description: "Dispatch readiness, POD health, fleet status, and live operations in one command center." },
  { key: "routes", title: "Route Planning", description: "Warehouse coverage, area hierarchy, fleet readiness, and route capacity planning." },
  { key: "dispatch", title: "Dispatch & Delivery", description: "Create dispatch notes, assign vehicle and driver, and track delivery execution." },
  { key: "tracking", title: "Live Tracking", description: "Operational live user visibility and tracking entry for dispatch-linked teams." },
];

function safeNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normalizeRows(response, keys = ["rows", "items", "data"]) {
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
}

function normalizeOrders(response) {
  return Array.isArray(response?.orders) ? response.orders : [];
}

function normalizeUsers(response) {
  return Array.isArray(response?.users) ? response.users : [];
}

function normalizeVehicles(response) {
  return Array.isArray(response?.vehicles) ? response.vehicles : [];
}

function normalizeWarehouses(response) {
  return Array.isArray(response?.warehouses) ? response.warehouses : [];
}

function normalizeLiveUsers(response) {
  return Array.isArray(response?.data?.items) ? response.data.items : [];
}

function nextDoc(prefix) {
  return `${prefix}-${Date.now()}`;
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
      partyId: draft.vehicleId || "logistics-team",
      partyName: draft.vehicleLabel || (draft.vehicleId ? `Vehicle ${draft.vehicleId}` : "Logistics Team"),
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

function buildDocumentUrl(title, rows = [], meta = {}) {
  const itemsHtml = rows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.value)}</td></tr>`)
    .join("");

  const metaHtml = Object.entries(meta || {})
    .map(([key, value]) => `<div><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</div>`)
    .join("");

  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 16px; font-size: 24px; }
          .meta { margin-bottom: 16px; color: #4b5563; line-height: 1.7; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">${metaHtml}</div>
        <table>
          <thead><tr><th>Field</th><th>Value</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function CompanyLogisticsWorkspace({ initialSection = "overview" }) {
  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [logisticsReport, setLogisticsReport] = useState(null);
  const [operationsReport, setOperationsReport] = useState(null);
  const [dispatchRows, setDispatchRows] = useState([]);
  const [companyOrders, setCompanyOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [preview, setPreview] = useState({ open: false, title: "", url: "" });
  const [dispatchDraft, setDispatchDraft] = useState({
    orderId: "",
    documentNo: nextDoc("CDN-LOG"),
    vehicleId: "",
    driverUserId: "",
    notes: "",
  });

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.allSettled([
        v2Api.reports.logistics(),
        v2Api.dashboard.operations(),
        v2Api.warehouseManager.listCompanyDispatches({ status: "all" }),
        v2Api.warehouseManager.listCompanySupplyOrders({ status: "all" }),
        v2Api.warehouseManager.listWarehouses(),
        apiGet("/vehicles"),
        apiGet("/users"),
        apiGet("/regions"),
        apiGet("/zones"),
        apiGet("/areas"),
        apiGet("/location/live-users"),
      ]);

      const [logisticsRes, operationsRes, dispatchRes, ordersRes, warehousesRes, vehiclesRes, usersRes, regionsRes, zonesRes, areasRes, liveUsersRes] = responses;
      if (logisticsRes.status === "fulfilled") setLogisticsReport(logisticsRes.value || null);
      if (operationsRes.status === "fulfilled") setOperationsReport(operationsRes.value || null);
      if (dispatchRes.status === "fulfilled") setDispatchRows(normalizeRows(dispatchRes.value, ["rows", "dispatches"]));
      if (ordersRes.status === "fulfilled") setCompanyOrders(normalizeOrders(ordersRes.value));
      if (warehousesRes.status === "fulfilled") setWarehouses(normalizeWarehouses(warehousesRes.value));
      if (vehiclesRes.status === "fulfilled") setVehicles(normalizeVehicles(vehiclesRes.value));
      if (usersRes.status === "fulfilled") {
        const allUsers = normalizeUsers(usersRes.value);
        setDrivers(
          allUsers.filter((user) => {
            const role = String(user?.role || "").toLowerCase();
            return role.includes("delivery") || role.includes("driver") || role.includes("logistics");
          }),
        );
      }
      if (regionsRes.status === "fulfilled") setRegions(Array.isArray(regionsRes.value?.regions) ? regionsRes.value.regions : []);
      if (zonesRes.status === "fulfilled") setZones(Array.isArray(zonesRes.value?.zones) ? zonesRes.value.zones : []);
      if (areasRes.status === "fulfilled") setAreas(Array.isArray(areasRes.value?.areas) ? areasRes.value.areas : []);
      if (liveUsersRes.status === "fulfilled") setLiveUsers(normalizeLiveUsers(liveUsersRes.value));

      const failure = responses.find((entry) => entry.status === "rejected");
      if (failure) setError(failure.reason?.message || "Some logistics signals could not be loaded.");
    } catch (err) {
      setError(err.message || "Failed to load logistics workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const id = setInterval(() => loadData(), 30000);
    return () => clearInterval(id);
  }, []);

  const readyOrders = useMemo(
    () => companyOrders.filter((row) => ["approved", "reserved", "ready_to_dispatch"].includes(String(row?.status || "").toLowerCase())),
    [companyOrders],
  );
  const selectedOrder = useMemo(() => readyOrders.find((row) => String(row?._id) === String(dispatchDraft.orderId)) || null, [readyOrders, dispatchDraft.orderId]);

  const vehicleOptions = useMemo(
    () => vehicles.map((row) => ({ value: String(row?._id || row?.vehicleId || ""), label: row?.name || row?.vehicleNo || row?.vehicleId || "Vehicle", raw: row })),
    [vehicles],
  );
  const driverOptions = useMemo(
    () => drivers.map((row) => ({ value: String(row?._id || row?.userId || ""), label: row?.fullName || row?.username || row?.mobile || "Driver", raw: row })),
    [drivers],
  );

  const fleetStats = useMemo(() => {
    const assignedDrivers = vehicles.filter((vehicle) => vehicle.driverName || vehicle.driverId).length;
    const withCapacity = vehicles.filter((vehicle) => safeNumber(vehicle.deliveryCapacity) > 0).length;
    return {
      total: vehicles.length,
      assignedDrivers,
      withoutDrivers: Math.max(vehicles.length - assignedDrivers, 0),
      withCapacity,
    };
  }, [vehicles]);

  const liveTrackingSummary = useMemo(() => {
    const driversOnly = liveUsers.filter((user) => {
      const role = String(user?.role || "").toLowerCase();
      return role.includes("driver") || role.includes("delivery") || role.includes("salesman") || role.includes("supplier");
    });
    const online = driversOnly.filter((row) => String(row?.status || "").toLowerCase() === "online").length;
    const idle = driversOnly.filter((row) => String(row?.status || "").toLowerCase() === "idle").length;
    return {
      total: driversOnly.length,
      online,
      idle,
      offline: Math.max(driversOnly.length - online - idle, 0),
      rows: driversOnly.slice(0, 10),
    };
  }, [liveUsers]);

  const statusCounts = useMemo(() => {
    const counts = { draft: 0, posted: 0, delivered: 0, exception: 0, podPending: 0 };
    dispatchRows.forEach((row) => {
      const status = String(row?.status || "draft").toLowerCase();
      if (status === "draft") counts.draft += 1;
      else if (status === "posted" || status === "dispatched" || status === "in_transit") counts.posted += 1;
      else if (status === "delivered" || status === "received") counts.delivered += 1;
      else counts.exception += 1;
      if (!["delivered", "received", "reversed"].includes(status) && !row?.podUrl) counts.podPending += 1;
    });
    return counts;
  }, [dispatchRows]);

  const coverageRows = useMemo(() => {
    return regions.map((region) => {
      const regionZones = zones.filter((zone) => String(zone?.regionId || "") === String(region?.regionId || region?._id || ""));
      const zoneIds = regionZones.map((zone) => String(zone?.zoneId || zone?._id || ""));
      const regionAreas = areas.filter((area) => zoneIds.includes(String(area?.zoneId || "")));
      return {
        _id: String(region?._id || region?.regionId || region?.name),
        regionName: region?.name || region?.regionName || "Region",
        zones: regionZones.length,
        areas: regionAreas.length,
        updatedAt: region?.updatedAt || region?.createdAt,
      };
    });
  }, [regions, zones, areas]);

  const warehouseRouteRows = useMemo(() => {
    return warehouses.map((warehouse) => {
      const warehouseId = String(warehouse?._id || warehouse?.warehouseId || "");
      const warehouseOrders = readyOrders.filter((row) => {
        const source = row?.dispatchFromWarehouse?.partyId || row?.receiveAtWarehouse?.partyId || row?.warehouseId || "";
        return String(source) === warehouseId;
      });
      const warehouseDispatches = dispatchRows.filter((row) => String(row?.dispatchFromWarehouse?.partyId || row?.warehouseId || "") === warehouseId);
      return {
        _id: warehouseId || warehouse?.name,
        warehouseName: warehouse?.name || warehouse?.warehouseName || warehouseId || "Warehouse",
        readyOrders: warehouseOrders.length,
        activeDispatches: warehouseDispatches.filter((row) => !["delivered", "received", "reversed"].includes(String(row?.status || "").toLowerCase())).length,
        latestDispatchAt: warehouseDispatches[0]?.createdAt || warehouseDispatches[0]?.dispatchedAt || null,
      };
    });
  }, [warehouses, readyOrders, dispatchRows]);

  async function handleCreateDispatch(shouldPost) {
    if (!selectedOrder) {
      setMessage("Select a company supply order first.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const selectedVehicle = vehicleOptions.find((row) => row.value === dispatchDraft.vehicleId);
      const payload = buildDispatchPayload(
        selectedOrder,
        { ...dispatchDraft, vehicleLabel: selectedVehicle?.label || "" },
        warehouses,
      );
      const created = await v2Api.warehouseManager.createCompanyDispatch(payload);
      const dispatch = created?.dispatch;
      if (shouldPost && dispatch?._id) {
        await v2Api.warehouseManager.postCompanyDispatch(dispatch._id);
      }
      await loadData();
      setMessage(shouldPost ? "Dispatch created and posted successfully." : "Dispatch draft created successfully.");
      setDispatchDraft({ orderId: "", documentNo: nextDoc("CDN-LOG"), vehicleId: "", driverUserId: "", notes: "" });
    } catch (err) {
      setMessage(err.message || "Failed to create dispatch.");
    } finally {
      setSubmitting(false);
    }
  }

  const openDispatchPreview = (dispatch) => {
    setPreview({
      open: true,
      title: dispatch?.documentNo || "Dispatch Note",
      url: buildDocumentUrl(dispatch?.documentNo || "Dispatch Note", [
        { label: "Status", value: dispatch?.status || "draft" },
        { label: "Distributor", value: dispatch?.distributor?.partyName || dispatch?.distributorId || "-" },
        { label: "Warehouse", value: dispatch?.dispatchFromWarehouse?.partyName || dispatch?.warehouseName || "-" },
        { label: "Vehicle", value: dispatch?.vehicleId || "-" },
        { label: "Driver", value: dispatch?.driverUserId || "-" },
        { label: "POD", value: dispatch?.podUrl ? "Available" : "Pending" },
      ], {
        "Dispatch No": dispatch?.documentNo || "-",
        "Created": formatDate(dispatch?.createdAt || dispatch?.dispatchedAt),
      }),
    });
  };

  const metrics = useMemo(
    () => [
      { label: "Dispatch Queue", value: readyOrders.length, helper: "Approved supply orders waiting for logistics." },
      { label: "In Transit", value: statusCounts.posted, helper: "Dispatch notes posted and currently moving." },
      { label: "Delivered", value: statusCounts.delivered, helper: "Dispatches completed and acknowledged." },
      { label: "POD Pending", value: statusCounts.podPending, helper: "Dispatches needing proof of delivery upload." },
      { label: "Fleet Ready", value: fleetStats.withCapacity, helper: `${fleetStats.assignedDrivers} vehicles with drivers assigned.` },
      { label: "Live Tracked Users", value: liveTrackingSummary.total, helper: `${liveTrackingSummary.online} online right now.` },
    ],
    [fleetStats.assignedDrivers, fleetStats.withCapacity, liveTrackingSummary.online, liveTrackingSummary.total, readyOrders.length, statusCounts.delivered, statusCounts.podPending, statusCounts.posted],
  );

  const logisticsModule = logisticsReport?.module || logisticsReport || {};
  const operationsCards = Array.isArray(operationsReport?.serviceHealth) ? operationsReport.serviceHealth : [];
  const recentDispatches = dispatchRows.slice(0, 12);

  const dispatchColumns = [
    { key: "documentNo", title: "Dispatch No" },
    {
      key: "distributor",
      title: "Distributor",
      render: (row) => row?.distributor?.partyName || row?.distributorId || "-",
    },
    {
      key: "dispatchFromWarehouse",
      title: "Warehouse",
      render: (row) => row?.dispatchFromWarehouse?.partyName || row?.warehouseName || "-",
    },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "draft" },
    {
      key: "pod",
      title: "POD",
      render: (row) => <StatusBadge value={row?.podUrl ? "Available" : "Pending"} tone={row?.podUrl ? "posted" : "pending"} />,
    },
    {
      key: "actions",
      title: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openDispatchPreview(row)} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            Preview
          </button>
          {row?.podUrl ? (
            <button
              type="button"
              onClick={() => setPreview({ open: true, title: `${row?.documentNo || "Dispatch"} POD`, url: row.podUrl })}
              className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              View POD
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const liveColumns = [
    { key: "fullName", title: "User", render: (row) => row?.fullName || row?.username || row?.name || "User" },
    { key: "role", title: "Role", render: (row) => row?.role || "-" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "offline" },
    { key: "updatedAt", title: "Last Update", render: (row) => formatDate(row?.updatedAt || row?.capturedAt) },
  ];

  const routeColumns = [
    { key: "warehouseName", title: "Warehouse" },
    { key: "readyOrders", title: "Ready Orders" },
    { key: "activeDispatches", title: "Active Dispatches" },
    { key: "latestDispatchAt", title: "Latest Dispatch", render: (row) => formatDate(row?.latestDispatchAt) },
  ];

  const coverageColumns = [
    { key: "regionName", title: "Region" },
    { key: "zones", title: "Zones" },
    { key: "areas", title: "Areas" },
    { key: "updatedAt", title: "Last Update", render: (row) => formatDate(row?.updatedAt) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Company dispatch / logistics"
        title="Distribution & Logistics Command Center"
        description="Manage dispatch queue, route readiness, vehicle and driver alignment, POD health, and live operations from one V2-first logistics workspace."
        actions={(
          <>
            <Link href="/dashboards/admin/assets/vehicles" className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Vehicle assignment
            </Link>
            <Link href="/dashboards/admin/live-tracking" className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Open live tracking
            </Link>
          </>
        )}
      />

      <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      {loading ? (
        <EmptyState title="Loading logistics workspace" description="Fetching V2 dispatch, route planning, and live operations signals." />
      ) : null}

      {!loading && activeSection.key === "overview" ? (
        <div className="space-y-5">
          <SectionCard title="Operations overview" description="Top operational signals for dispatch, POD, and route readiness.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {metrics.map((card) => (
                <div key={card.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{card.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-950">{safeNumber(card.value).toLocaleString()}</div>
                  <div className="mt-2 text-sm text-zinc-600">{card.helper}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard title="Logistics health" description="Shared V2 logistics KPIs and dispatch execution health.">
              <div className="grid gap-3 md:grid-cols-2">
                {(logisticsModule?.cards || operationsCards).slice(0, 6).map((item, index) => (
                  <div key={`${item?.title || item?.label || "metric"}-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold text-zinc-900">{item?.title || item?.label || "Logistics Metric"}</div>
                    <div className="mt-2 text-3xl font-semibold text-zinc-950">{safeNumber(item?.value).toLocaleString()}</div>
                    <div className="mt-1 text-sm text-zinc-600">{item?.note || item?.helper || "Operational V2 signal"}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Dispatch state summary" description="Track current dispatch progression and exception signals.">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Draft notes</span><StatusBadge value={String(statusCounts.draft)} tone="draft" /></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">In transit</span><StatusBadge value={String(statusCounts.posted)} tone="posted" /></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Delivered</span><StatusBadge value={String(statusCounts.delivered)} tone="approved" /></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Exceptions</span><StatusBadge value={String(statusCounts.exception)} tone="unpaid" /></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">POD pending</span><StatusBadge value={String(statusCounts.podPending)} tone="pending" /></div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Recent dispatch notes" description="Latest company dispatch notes with POD visibility and quick preview.">
            <DocumentTable
              columns={dispatchColumns}
              rows={recentDispatches}
              emptyTitle="No dispatch notes yet"
              emptyDescription="Create the first dispatch from the dispatch queue to start delivery operations."
            />
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "routes" ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Warehouse route board" description="Route capacity by warehouse, ready orders, and active dispatches.">
              <DocumentTable
                columns={routeColumns}
                rows={warehouseRouteRows}
                emptyTitle="No warehouse routing data"
                emptyDescription="Assign warehouses and create dispatch-ready orders to build your route board."
              />
            </SectionCard>
            <SectionCard title="Fleet readiness" description="Driver assignment and vehicle capacity health.">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Total fleet</span><span className="text-sm font-semibold text-zinc-900">{fleetStats.total}</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Assigned drivers</span><span className="text-sm font-semibold text-zinc-900">{fleetStats.assignedDrivers}</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Without drivers</span><span className="text-sm font-semibold text-zinc-900">{fleetStats.withoutDrivers}</span></div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Vehicles with capacity</span><span className="text-sm font-semibold text-zinc-900">{fleetStats.withCapacity}</span></div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                Tip: set driver and delivery capacity on every active vehicle to improve route planning accuracy.
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Coverage matrix" description="Region, zone, and area coverage for logistics balancing.">
            <DocumentTable
              columns={coverageColumns}
              rows={coverageRows}
              emptyTitle="No regional coverage yet"
              emptyDescription="Add region, zone, and area master data to unlock route planning depth."
            />
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "dispatch" ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Create dispatch note" description="Select a ready company supply order, assign vehicle/driver, and create or post the dispatch note.">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-zinc-700">
                  <span className="font-medium">Company supply order</span>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    value={dispatchDraft.orderId}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, orderId: event.target.value }))}
                  >
                    <option value="">Select order</option>
                    {readyOrders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order.documentNo || order.orderNo || order._id} · {order?.distributor?.partyName || order?.distributorId || "Distributor"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-zinc-700">
                  <span className="font-medium">Dispatch note no</span>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    value={dispatchDraft.documentNo}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, documentNo: event.target.value }))}
                  />
                </label>

                <label className="space-y-2 text-sm text-zinc-700">
                  <span className="font-medium">Vehicle</span>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    value={dispatchDraft.vehicleId}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, vehicleId: event.target.value }))}
                  >
                    <option value="">Select vehicle</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-zinc-700">
                  <span className="font-medium">Driver / delivery</span>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    value={dispatchDraft.driverUserId}
                    onChange={(event) => setDispatchDraft((prev) => ({ ...prev, driverUserId: event.target.value }))}
                  >
                    <option value="">Select driver</option>
                    {driverOptions.map((driver) => (
                      <option key={driver.value} value={driver.value}>{driver.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-sm text-zinc-700">
                <span className="font-medium">Dispatch instructions</span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                  value={dispatchDraft.notes}
                  onChange={(event) => setDispatchDraft((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Add loading, route, POD, or exception handling notes"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCreateDispatch(false)}
                  className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Create dispatch draft
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleCreateDispatch(true)}
                  className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  Create and post dispatch
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Selected order summary" description="Quick review of distributor, warehouse, and line count before dispatch posting.">
              {selectedOrder ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Order</div>
                    <div className="mt-1 text-base font-semibold text-zinc-950">{selectedOrder.documentNo || selectedOrder.orderNo || "Supply Order"}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Distributor</div>
                      <div className="mt-1 text-sm font-medium text-zinc-900">{selectedOrder?.distributor?.partyName || selectedOrder?.distributorId || "-"}</div>
                    </div>
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Warehouse</div>
                      <div className="mt-1 text-sm font-medium text-zinc-900">{selectedOrder?.dispatchFromWarehouse?.partyName || selectedOrder?.receiveAtWarehouse?.partyName || "-"}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                    <strong>{(selectedOrder?.lines || []).length}</strong> line items ready for dispatch.
                  </div>
                </div>
              ) : (
                <EmptyState title="Select an order" description="Choose a ready company supply order to prepare dispatch details." />
              )}
            </SectionCard>
          </div>

          <SectionCard title="Dispatch notes" description="Review dispatch documents, POD status, and delivery progress.">
            <DocumentTable
              columns={dispatchColumns}
              rows={dispatchRows}
              emptyTitle="No dispatch notes created"
              emptyDescription="Create a dispatch draft from a ready company supply order to begin logistics execution."
            />
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "tracking" ? (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard title="Live tracking entry" description="Open the dedicated live tracking module for map view, playback, and operator focus.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Tracked operations users</div>
                  <div className="mt-2 text-3xl font-semibold text-zinc-950">{liveTrackingSummary.total}</div>
                  <div className="mt-2 text-sm text-zinc-600">Drivers, delivery staff, salesmen, and suppliers visible in current live tracking scope.</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Online now</div>
                  <div className="mt-2 text-3xl font-semibold text-zinc-950">{liveTrackingSummary.online}</div>
                  <div className="mt-2 text-sm text-zinc-600">Idle users: {liveTrackingSummary.idle} · Offline users: {liveTrackingSummary.offline}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/dashboards/admin/live-tracking" className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
                  Open live tracking map
                </Link>
                <Link href="/dashboards/admin/logistics/routes" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  Return to route planning
                </Link>
              </div>
            </SectionCard>

            <SectionCard title="Tracked team snapshot" description="Recent live activity for dispatch-related roles.">
              <DocumentTable
                columns={liveColumns}
                rows={liveTrackingSummary.rows}
                emptyTitle="No live users found"
                emptyDescription="Once users sync location, they will appear here for dispatch and route operations."
              />
            </SectionCard>
          </div>
        </div>
      ) : null}

      <DocumentViewerModal open={preview.open} title={preview.title} documentUrl={preview.url} onClose={() => setPreview({ open: false, title: "", url: "" })} />
    </div>
  );
}
