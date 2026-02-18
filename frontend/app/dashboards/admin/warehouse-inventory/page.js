"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  { key: "PURCHASING_STOCK", title: "1 Purchasing Stock" },
  { key: "SALE_STOCK", title: "2 Sale Stock" },
  { key: "DAMAGE_STOCK", title: "3 Damage Stock" },
  { key: "RETURN_STOCK", title: "4 Return Stock" },
  { key: "W2W_TRANSFER", title: "5 Warehouse to Warehouse Transfer" },
  { key: "STOCK_SUMMARY", title: "6 Stock Summary" },
  { key: "LOW_STOCK", title: "7 Low Stock Alert" },
  { key: "INVENTORY_LEDGER", title: "8 Inventory Ledger" },
];

const transferStatuses = ["pending", "approved", "transit-in", "completed"];

const saleModes = [
  { key: "brand", label: "Sale to Brand" },
  { key: "distributor", label: "Sale to Distributor" },
  { key: "subDistributor", label: "Sale to Sub-Distributor" },
];

const saleLedgerFilters = [
  { key: "all", label: "All" },
  { key: "brand", label: "To Brand" },
  { key: "distributor", label: "To Distributor" },
  { key: "subDistributor", label: "To Sub-Distributor" },
];

const returnStockLedgerFilters = [
  { key: "all", label: "All Return Stock" },
  { key: "brand", label: "From Brand" },
  { key: "distributor", label: "From Distributor" },
];

const returnStockModes = [
  { key: "brand", label: "From Brand" },
  { key: "distributor", label: "From Distributor" },
];

const emptyLine = {
  productId: "",
  qty: "",
  toValue: "0",
  discValue: "0",
  extraValue: "0",
  bonsValue: "0",
  gstPer: "0",
  manufactureDate: "",
  expiryDate: "",
  returnDate: "",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getSizeMultiplier(product) {
  if (!product) return 1;
  const raw = String(product.size || "");
  const nums = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (nums.length) return nums.reduce((acc, n) => acc * n, 1);
  if (toNum(product.packSize) > 0) return toNum(product.packSize);
  return 1;
}

function computeLine(line, product) {
  const sizeMultiplier = getSizeMultiplier(product);
  const qty = toNum(line.qty);
  const rate = toNum(product?.wholesalePrice || 0);
  const gross = sizeMultiplier * qty * rate;
  const toValue = toNum(line.toValue);
  const discValue = line.discValue === "" ? toNum(product?.discountPer || 0) : toNum(line.discValue);
  const extraValue = toNum(line.extraValue);
  const bonsValue = toNum(line.bonsValue);
  const v4gst = gross - toValue - discValue - extraValue - bonsValue;
  const gstPer = toNum(line.gstPer);
  const gstAmount = (v4gst * gstPer) / 100;
  const netAmt = v4gst + gstAmount;
  return {
    sizeText: product?.size || "-",
    sizeMultiplier,
    qty,
    rate,
    gross,
    toValue,
    discValue,
    extraValue,
    bonsValue,
    v4gst,
    gstPer,
    gstAmount,
    netAmt,
  };
}

function uniqById(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = row?._id || row?.transactionCode || JSON.stringify(row);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function normalizeRequestSource(value) {
  return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
}

function isSaleOrderRequest(row) {
  if (!row || row.transactionType !== "SALE_STOCK") return false;
  const source = normalizeRequestSource(row.requestSourceRole || row.fromEntityType || "");
  const hasKnownSource = source.includes("brandmanager") || source.includes("distributor") || source === "brand";
  return hasKnownSource || Boolean(row.requestStatus) || Boolean(row.requestReadAt);
}

function sourceRoleLabel(row) {
  const source = normalizeRequestSource(row?.requestSourceRole || row?.fromEntityType || "");
  if (source.includes("brandmanager") || source === "brand") return "Brand Manager";
  if (source.includes("distributor")) return "Distributor";
  return row?.requestSourceRole || row?.fromEntityType || "-";
}


function normalizeRequestStatus(value) {
  const status = String(value || "").toUpperCase();
  return status === "DISPATCH" ? "DISPATCHED" : status;
}

function requestRowClass(status) {
  if (status === "REJECTED") return "border-b bg-red-50";
  if (status === "APPROVED" || status === "DISPATCHED") return "border-b bg-blue-50";
  if (status === "DELIVERED") return "border-b bg-emerald-50";
  return "border-b";
}

function mapRequestStatusForApi(status) {
  return normalizeRequestStatus(status);
}

export default function WarehouseInventoryModulePage() {
  const [selectedCard, setSelectedCard] = useState(cards[0].key);
  const [saleMode, setSaleMode] = useState("brand");
  const [saleLedgerFilter, setSaleLedgerFilter] = useState("all");
  const [returnStockMode, setReturnStockMode] = useState("brand");
  const [returnStockLedgerFilter, setReturnStockLedgerFilter] = useState("all");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [fields, setFields] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [summaryDetailModal, setSummaryDetailModal] = useState(null);
  const [summaryDetailRows, setSummaryDetailRows] = useState([]);
  const [summaryDetailLoading, setSummaryDetailLoading] = useState(false);
  const [summaryDetailRemoving, setSummaryDetailRemoving] = useState(false);
  const [summaryWarehouseFilter, setSummaryWarehouseFilter] = useState("");
  const [lowStockWarehouseFilter, setLowStockWarehouseFilter] = useState("");
  const [ledgerWarehouseFilter, setLedgerWarehouseFilter] = useState("");
  const [ledgerMovementTypeFilter, setLedgerMovementTypeFilter] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const submitLockRef = useRef(false);
  const [form, setForm] = useState({
    warehouseId: "",
    fromEntityName: "",
    toWarehouseId: "",
    businessType: "",
    businessUserId: "",
    businessName: "",
    regionId: "",
    zoneId: "",
    territoryName: "",
    distributorUserId: "",
    subDistributorName: "",
    address: "",
    extraDiscPer: "0",
    advTaxPer: "0",
    whTaxPer: "0",
    expense: "0",
    items: [{ ...emptyLine }],
  });
  const [transferForm, setTransferForm] = useState({
    productId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    quantity: "",
    status: "pending",
    note: "",
  });

  async function loadAll() {
    const result = await Promise.allSettled([
      apiFetch("/products"),
      apiFetch("/warehouses"),
      apiFetch("/users"),
      apiFetch("/regions"),
      apiFetch("/zones"),
      apiFetch("/fields?limit=500"),
      apiFetch("/inventory/transactions"),
      apiFetch("/inventory/transfers"),
      apiFetch("/inventory/movements"),
      apiFetch("/inventory/summary"),
      apiFetch("/inventory/low-stock"),
      apiFetch("/inventory/near-expiry-products"),
    ]);

    const [productsRes, warehousesRes, usersRes, regionsRes, zonesRes, fieldsRes, txRes, transfersRes, movementsRes, summaryRes, lowStockRes, nearRes] =
      result.map((entry) => (entry.status === "fulfilled" ? entry.value : null));

    if (productsRes) setProducts(productsRes.products || []);
    if (warehousesRes) setWarehouses(warehousesRes.warehouses || []);
    if (usersRes) setUsers(usersRes.users || []);
    if (regionsRes) setRegions(regionsRes.regions || []);
    if (zonesRes) setZones(zonesRes.zones || []);
    if (fieldsRes) setFields(fieldsRes.fields || []);
    if (txRes) setTransactions(uniqById(txRes.transactions || []));
    if (transfersRes) setTransfers(transfersRes.transfers || []);
    if (movementsRes) setMovements(movementsRes.movements || []);
    if (summaryRes) setSummary(summaryRes.summary || []);
    if (lowStockRes) setLowStock(lowStockRes.lowStock || []);
    if (nearRes) setNearExpiry(nearRes.products || []);

    if (result.every((entry) => entry.status === "rejected")) {
      toast.error("Failed to load module data");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const brandManagers = useMemo(() => users.filter((u) => u.role === "Brand Manager"), [users]);
  const distributors = useMemo(() => users.filter((u) => u.role === "Distributor"), [users]);
  const businessTypes = useMemo(
    () => [...new Set(users.map((u) => String(u.businessType || "").trim()).filter(Boolean))],
    [users],
  );
  const zonesForRegion = useMemo(() => {
    const region = regions.find((r) => r._id === form.regionId);
    return region ? zones.filter((z) => z.regionId === region.regionId) : [];
  }, [regions, zones, form.regionId]);
  const territoriesForZone = useMemo(() => {
    const zone = zones.find((z) => z._id === form.zoneId);
    if (!zone) return [];
    return [
      ...new Set(
        users
          .filter((u) => u.zoneId === zone.zoneId || u.zoneName === zone.name)
          .map((u) => u.territoryName)
          .filter(Boolean),
      ),
    ];
  }, [zones, users, form.zoneId]);
  const fieldsForTerritory = useMemo(() => {
    return fields.filter((f) => {
      const regionMatch = !form.regionId || f.regionId === (regions.find((r) => r._id === form.regionId)?.regionId || "");
      const zoneMatch = !form.zoneId || f.zoneId === (zones.find((z) => z._id === form.zoneId)?.zoneId || "");
      const territoryMatch =
        !form.territoryName ||
        f.territoryName === form.territoryName ||
        f.areaName === form.territoryName;
      return regionMatch && zoneMatch && territoryMatch;
    });
  }, [fields, form.regionId, form.zoneId, form.territoryName, regions, zones]);

  const distributorsForTerritory = useMemo(
    () => distributors.filter((d) => !form.territoryName || d.territoryName === form.territoryName),
    [distributors, form.territoryName],
  );
  const brandBusinessUsers = useMemo(() => {
    const selectedField = fieldsForTerritory.find((f) => f._id === form.fieldId);
    return brandManagers.filter((u) => !selectedField || u.fieldId === selectedField.fieldId || u.fieldName === selectedField.name);
  }, [brandManagers, fieldsForTerritory, form.fieldId]);
  const selectedBrandManager = useMemo(() => brandBusinessUsers.find((u) => u._id === form.businessUserId), [brandBusinessUsers, form.businessUserId]);
  const selectedDistributor = useMemo(
    () => distributorsForTerritory.find((u) => u._id === form.distributorUserId),
    [distributorsForTerritory, form.distributorUserId],
  );

  useEffect(() => {
    if (!form.regionId && form.zoneId) setField("zoneId", "");
  }, [form.regionId, form.zoneId]);

  useEffect(() => {
    if (!form.zoneId && form.territoryName) setField("territoryName", "");
  }, [form.zoneId, form.territoryName]);

  useEffect(() => {
    if (!form.territoryName) {
      if (form.fieldId) setField("fieldId", "");
      if (form.businessUserId) setField("businessUserId", "");
      if (form.distributorUserId) setField("distributorUserId", "");
    }
  }, [form.territoryName, form.fieldId, form.businessUserId, form.distributorUserId]);

  useEffect(() => {
    if (saleMode === "brand") {
      setField("address", selectedBrandManager?.address || "");
      setField("businessName", selectedBrandManager?.businessName || selectedBrandManager?.fullName || "");
    } else if (saleMode === "distributor") {
      const name = selectedDistributor?.businessName || selectedDistributor?.fullName || "";
      setField("address", selectedDistributor?.address || "");
      setField("distributorName", name);
    }
  }, [saleMode, selectedBrandManager, selectedDistributor]);

  const cardTx = useMemo(() => {
    if (["W2W_TRANSFER", "STOCK_SUMMARY", "LOW_STOCK", "INVENTORY_LEDGER"].includes(selectedCard)) return [];
    const byType = transactions.filter((t) => t.transactionType === selectedCard);
    if (selectedCard === "RETURN_STOCK") {
      const processed = byType.filter((t) => String(t.requestStatus || "APPROVED").toUpperCase() !== "PENDING");
      if (returnStockLedgerFilter === "all") return processed;
      const returnSourceType = returnStockLedgerFilter === "brand" ? "BRAND" : "DISTRIBUTOR";
      return processed.filter((t) => {
        const storedType = String(t.fromEntityType || "").trim().toUpperCase();
        if (storedType) return storedType === returnSourceType;
        return returnStockLedgerFilter === "brand" ? !t.distributorName : Boolean(t.distributorName);
      });
    }

    if (selectedCard !== "SALE_STOCK") return byType;

    if (saleLedgerFilter === "all") return byType;

    const saleTargetType = {
      brand: "BRAND",
      distributor: "DISTRIBUTOR",
      subDistributor: "SUB_DISTRIBUTOR",
    }[saleLedgerFilter];

    return byType.filter((t) => {
      const storedType = String(t.toEntityType || "").trim().toUpperCase();
      if (storedType) return storedType === saleTargetType;

      if (saleLedgerFilter === "subDistributor") return Boolean(t.subDistributorName);
      if (saleLedgerFilter === "distributor") return Boolean(t.distributorName) && !t.subDistributorName;
      return !t.distributorName && !t.subDistributorName;
    });
  }, [transactions, selectedCard, saleLedgerFilter, returnStockLedgerFilter]);

  const saleStockRequests = useMemo(
    () =>
      transactions
        .filter((t) => isSaleOrderRequest(t))
        .sort((a, b) => new Date(b.transactionAt).getTime() - new Date(a.transactionAt).getTime()),
    [transactions],
  );

  const returnStockRequests = useMemo(
    () =>
      transactions
        .filter((t) => t.transactionType === "RETURN_STOCK")
        .filter((t) => ["Brand Manager", "Distributor"].includes(String(t.requestSourceRole || "")))
        .sort((a, b) => new Date(b.transactionAt).getTime() - new Date(a.transactionAt).getTime()),
    [transactions],
  );

  const filteredSummary = useMemo(() => {
    if (!summaryWarehouseFilter) return summary;
    return summary.filter((row) => row._id?.warehouseId === summaryWarehouseFilter || row.warehouseId === summaryWarehouseFilter);
  }, [summary, summaryWarehouseFilter]);

  const filteredLowStock = useMemo(() => {
    if (!lowStockWarehouseFilter) return lowStock;
    return lowStock.filter((row) => row.warehouseId === lowStockWarehouseFilter);
  }, [lowStock, lowStockWarehouseFilter]);

  const filteredMovements = useMemo(() => {
    return movements.filter((row) => {
      if (ledgerWarehouseFilter && row.warehouseId !== ledgerWarehouseFilter) return false;
      if (ledgerMovementTypeFilter && row.movementType !== ledgerMovementTypeFilter) return false;
      if (ledgerSearch) {
        const q = ledgerSearch.toLowerCase();
        const text = `${row.productName || ""} ${row.referenceId || ""} ${row.warehouseName || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [movements, ledgerWarehouseFilter, ledgerMovementTypeFilter, ledgerSearch]);

  const lineRows = useMemo(
    () =>
      form.items.map((line, idx) => {
        const product = products.find((p) => p._id === line.productId);
        return { idx, line, product, calc: computeLine(line, product) };
      }),
    [form.items, products],
  );

  const totalAmount = useMemo(() => lineRows.reduce((sum, r) => sum + r.calc.netAmt, 0), [lineRows]);
  const extraDiscAmt = useMemo(() => (totalAmount * toNum(form.extraDiscPer)) / 100, [totalAmount, form.extraDiscPer]);
  const advTaxAmt = useMemo(() => (totalAmount * toNum(form.advTaxPer)) / 100, [totalAmount, form.advTaxPer]);
  const whTaxAmt = useMemo(() => (totalAmount * toNum(form.whTaxPer)) / 100, [totalAmount, form.whTaxPer]);
  const grandTotal = useMemo(
    () => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + toNum(form.expense),
    [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense],
  );

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }
  function setTransferField(key, value) {
    setTransferForm((s) => ({ ...s, [key]: value }));
  }
  function setItem(i, key, value) {
    setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) }));
  }
  function addItem() {
    setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));
  }
  function removeItem(i) {
    setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  }

  const normalizedItems = useMemo(
    () =>
      lineRows
        .filter((r) => r.product)
        .map((r) => ({
          productId: r.product.productId,
          productName: r.product.name,
          cartonSize: `1x${r.calc.qty || 0}`,
          cartons: 1,
          totalPacks: r.calc.qty || 0,
          packsPerCarton: r.calc.qty || 0,
          onePackPrice: r.calc.rate,
          oneCartonPrice: r.calc.rate * r.calc.sizeMultiplier,
          totalPrice: r.calc.netAmt,
          unitPrice: r.calc.rate,
          manufactureDate: ["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard)
            ? r.line.manufactureDate || undefined
            : undefined,
          expiryDate: ["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard)
            ? r.line.expiryDate || undefined
            : undefined,
          returnDate: selectedCard === "RETURN_STOCK" ? r.line.returnDate || undefined : undefined,
          notes: `gross:${r.calc.gross},to:${r.calc.toValue},disc:${r.calc.discValue},extra:${r.calc.extraValue},bons:${r.calc.bonsValue},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
        })),
    [lineRows, selectedCard],
  );

  async function submit(e) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSaving(true);
    try {
      const fromWarehouse = warehouses.find((w) => w._id === form.warehouseId);
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const selectedBrand = brandBusinessUsers.find((u) => u._id === form.businessUserId);
      const selectedDist = distributorsForTerritory.find((u) => u._id === form.distributorUserId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);

      const movementWarehouse = ["PURCHASING_STOCK", "RETURN_STOCK"].includes(selectedCard) ? toWarehouse : fromWarehouse;

      const body = {
        transactionType: selectedCard,
        warehouseId: movementWarehouse?.warehouseId || "",
        warehouseName: movementWarehouse?.name || "",
        adjustment: 0,
        extraDiscPer: Number(form.extraDiscPer || 0),
        advTaxPer: Number(form.advTaxPer || 0),
        whTaxPer: Number(form.whTaxPer || 0),
        expense: Number(form.expense || 0),
        items: normalizedItems,
        subtotal: totalAmount,
        grandTotal,
      };

      if (selectedCard === "PURCHASING_STOCK") {
        body.fromEntityName = form.fromEntityName;
        body.toEntityName = toWarehouse?.name || "";
      }

      if (selectedCard === "SALE_STOCK") {
        body.fromEntityName = fromWarehouse?.name || "";
        if (saleMode === "brand") {
          body.toEntityType = "BRAND";
          body.toEntityName = form.businessName || selectedBrand?.businessName || selectedBrand?.fullName || "";
          body.brandName = body.toEntityName;
          body.note = form.address;
        }
        if (saleMode === "distributor") {
          body.toEntityType = "DISTRIBUTOR";
          body.regionId = region?.regionId || "";
          body.regionName = region?.name || "";
          body.zoneId = zone?.zoneId || "";
          body.zoneName = zone?.name || "";
          body.territory = form.territoryName;
          body.distributorName = selectedDist?.businessName || selectedDist?.fullName || "";
          body.toEntityName = body.distributorName;
          body.note = form.address;
        }
        if (saleMode === "subDistributor") {
          body.toEntityType = "SUB_DISTRIBUTOR";
          body.regionId = region?.regionId || "";
          body.regionName = region?.name || "";
          body.zoneId = zone?.zoneId || "";
          body.zoneName = zone?.name || "";
          body.territory = form.territoryName;
          body.subDistributorName = form.subDistributorName;
          body.toEntityName = form.subDistributorName;
          body.note = form.address;
        }
      }

      if (selectedCard === "RETURN_STOCK") {
        body.toEntityName = toWarehouse?.name || "";
        body.warehouseId = toWarehouse?.warehouseId || "";
        body.warehouseName = toWarehouse?.name || "";
        body.regionId = region?.regionId || "";
        body.regionName = region?.name || "";
        body.zoneId = zone?.zoneId || "";
        body.zoneName = zone?.name || "";
        body.territory = form.territoryName;
        body.note = form.address;
        if (returnStockMode === "distributor") {
          body.fromEntityType = "DISTRIBUTOR";
          body.distributorName = selectedDist?.businessName || selectedDist?.fullName || "";
          body.fromEntityName = body.distributorName;
        } else {
          body.fromEntityType = "BRAND";
          body.fieldId = form.fieldId;
          body.fieldName = fieldsForTerritory.find((f) => f._id === form.fieldId)?.name || "";
          body.brandName = selectedBrand?.businessName || selectedBrand?.fullName || form.businessName;
          body.fromEntityName = body.brandName;
        }
      }

      await apiFetch("/inventory/transactions", { method: "POST", body });
      toast.success("Saved successfully.");
      setForm((s) => ({ ...s, items: [{ ...emptyLine }], extraDiscPer: "0", advTaxPer: "0", whTaxPer: "0", expense: "0" }));
      await loadAll();
    } catch (e2) {
      toast.error(e2.message || "Failed to save");
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  }

  async function submitTransfer(e) {
    e.preventDefault();
    setTransferSaving(true);
    try {
      const product = products.find((p) => p._id === transferForm.productId);
      const fromWarehouse = warehouses.find((w) => w._id === transferForm.fromWarehouseId);
      const toWarehouse = warehouses.find((w) => w._id === transferForm.toWarehouseId);
      if (!product || !fromWarehouse || !toWarehouse || Number(transferForm.quantity || 0) <= 0 || !String(transferForm.status || "").trim() || !String(transferForm.note || "").trim()) {
        toast.error("Please fill all transfer fields.");
        return;
      }
      await apiFetch("/inventory/transfers", {
        method: "POST",
        body: {
          productId: product?.productId || "",
          productName: product?.name || "",
          fromWarehouseId: fromWarehouse?.warehouseId || "",
          fromWarehouseName: fromWarehouse?.name || "",
          toWarehouseId: toWarehouse?.warehouseId || "",
          toWarehouseName: toWarehouse?.name || "",
          quantity: Number(transferForm.quantity || 0),
          status: transferForm.status,
          note: transferForm.note,
        },
      });
      setTransferForm({
        productId: "",
        fromWarehouseId: "",
        toWarehouseId: "",
        quantity: "",
        status: "pending",
        note: "",
      });
      toast.success("Transfer created.");
      await loadAll();
    } catch (e2) {
      toast.error(e2.message || "Failed to create transfer");
    } finally {
      setTransferSaving(false);
    }
  }

  async function updateTransferStatus(transferId, status) {
    try {
      await apiFetch(`/inventory/transfers/${transferId}`, {
        method: "PUT",
        body: { status },
      });
      toast.success("Transfer status updated.");
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Failed to update transfer status");
    }
  }

  async function editTransferStatus(transfer) {
    const status = prompt(`Set transfer status (${transferStatuses.join(", ")})`, transfer.status || "pending");
    if (!status) {
      toast.info("Edit cancelled.");
      return;
    }
    if (!transferStatuses.includes(status)) {
      toast.error("Invalid status.");
      return;
    }
    await updateTransferStatus(transfer._id, status);
  }

  async function deleteTransfer(transferId) {
    if (!confirm("Delete this transfer?")) {
      toast.info("Delete cancelled.");
      return;
    }
    try {
      await apiFetch(`/inventory/transfers/${transferId}`, { method: "DELETE" });
      toast.success("Transfer deleted.");
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Failed to delete transfer");
    }
  }

  function printTransferReceipt(transfer) {
    const logo = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
        <div>
          <div style="font-weight:700;font-size:16px;">AIM-HYGIENICS</div>
          <div style="font-size:11px;color:#555;">PVT LIMITED</div>
        </div>
      </div>`;

    const totalAmount = Number(transfer.totalAmount || transfer.amount || 0);
    const expense = Number(transfer.expense || 0);
    const grandTotal = totalAmount + expense;

    const html = `
      <html>
      <body style="font-family: Arial; padding: 16px; position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;">${logo}<div style="text-align:right;"><div style="font-size:13px;font-weight:700;">Warehouse Transfer</div></div></div>
        <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:12px;">
          <div>Date: ${transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : "-"}</div>
          <div>Receipt #: ${transfer._id}</div>
        </div>
        <div style="margin-top:8px;font-size:12px;">From: ${transfer.fromWarehouseName || "-"}</div>
        <div style="font-size:12px;">To: ${transfer.toWarehouseName || "-"}</div>
        <div style="font-size:12px;">Company: AIM-HYGIENICS PVT LIMITED</div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead>
            <tr>
              <th>Product</th>
              <th>From</th>
              <th>To</th>
              <th>Qty</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${transfer.productName || "-"}</td>
              <td>${transfer.fromWarehouseName || "-"}</td>
              <td>${transfer.toWarehouseName || "-"}</td>
              <td>${transfer.quantity || 0}</td>
              <td>${transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : "-"}</td>
              <td>${transfer.status || "-"}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:12px; font-size:12px; display:flex; justify-content:flex-end;">
          <div style="min-width:260px;">
            <div style="display:flex; justify-content:space-between;"><span>Total Amount:</span><strong>${totalAmount.toFixed(2)}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Expense:</span><span>${expense.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; border-top:1px solid #ccc; padding-top:4px;"><span><strong>Grand Total:</strong></span><strong>${grandTotal.toFixed(2)}</strong></div>
          </div>
        </div>
        <div style="margin-top:16px;text-align:center;font-size:13px;font-weight:600;">Thank you for bussiness with us</div>
      </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  function printInvoice(txn) {
    const logo = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
        <div>
          <div style="font-weight:700;font-size:16px;">AIM-HYGIENICS</div>
          <div style="font-size:11px;color:#555;">PVT LIMITED</div>
        </div>
      </div>`;

    const rows = (txn.items || []).map((i, idx) => {
      const parts = Object.fromEntries(String(i.notes || "").split(",").map((seg) => seg.split(":")));
      return `<tr><td>${idx + 1}</td><td>${i.productName || "-"}</td><td>${i.totalPacks || 0}</td><td>${i.onePackPrice || 0}</td><td>${parts.gross || 0}</td><td>${parts.to || 0}</td><td>${parts.disc || 0}</td><td>${parts.extra || 0}</td><td>${parts.bons || 0}</td><td>${parts.v4gst || 0}</td><td>${parts.gst || 0}</td><td>${parts.net || i.totalPrice || 0}</td></tr>`;
    });
    const lineTotal = (txn.items || []).reduce((sum, i) => {
      const parts = Object.fromEntries(String(i.notes || "").split(",").map((seg) => seg.split(":")));
      return sum + toNum(parts.net || i.totalPrice);
    }, 0);
    const totalAmount = toNum(txn.subtotal || lineTotal);
    const extraDiscPer = toNum(txn.extraDiscPer);
    const heading = txn.transactionType === "DAMAGE_STOCK"
      ? "Damage Stock"
      : txn.transactionType === "RETURN_STOCK"
        ? "Return Stock"
        : "Sales Tax Invoice";
    const requestStatus = normalizeRequestStatus(txn.requestStatus || txn.status || "");
    const showDecisionStamp = ["APPROVED", "REJECTED", "DISPATCHED", "DELIVERED"].includes(requestStatus)
      && ["SALE_STOCK", "RETURN_STOCK"].includes(String(txn.transactionType || ""));
    const stampStyle = requestStatus === "REJECTED"
      ? { color: "#991b1b", bg: "rgba(254,226,226,0.82)" }
      : requestStatus === "DELIVERED"
        ? { color: "#166534", bg: "rgba(220,252,231,0.82)" }
        : { color: "#1d4ed8", bg: "rgba(219,234,254,0.90)" };
    const statusStamp = showDecisionStamp
      ? `<div style="position:absolute; top:96px; right:22px; transform:rotate(-16deg); border:3px solid ${stampStyle.color}; color:${stampStyle.color}; background:${stampStyle.bg}; padding:8px 14px; font-size:22px; font-weight:800; letter-spacing:1px; border-radius:8px;">${requestStatus}</div>`
      : "";
    const rawNote = String(txn.note || "").trim();
    const extractedAddress = (rawNote.match(/Address\s*:\s*(.*)$/i)?.[1] || rawNote).trim();
    const advTaxPer = toNum(txn.advTaxPer);
    const whTaxPer = toNum(txn.whTaxPer);
    const expense = toNum(txn.expense);
    const extraDiscAmt = (totalAmount * extraDiscPer) / 100;
    const advTaxAmt = (totalAmount * advTaxPer) / 100;
    const whTaxAmt = (totalAmount * whTaxPer) / 100;
    const calculatedGrandTotal = totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + expense;

    const html = `
      <html>
      <body style="font-family: Arial; padding: 16px; position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;">${logo}<div style="text-align:right;"><div style="font-size:13px;font-weight:700;">${heading}</div></div></div>
        ${statusStamp}
        <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:12px;">
          <div>Date: ${new Date(txn.transactionAt).toLocaleDateString()}</div>
          <div>Invoice #: ${txn.transactionCode}</div>
        </div>
        <div style="margin-top:8px;font-size:12px;">Invoice From: ${txn.fromEntityName || txn.warehouseName || "-"}</div>
        <div style="font-size:12px;">Bill To: ${txn.toEntityName || txn.distributorName || "-"}</div>
        <div style="font-size:12px;">Address: ${extractedAddress || "-"}</div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; margin-top:10px; font-size:12px;">
          <thead><tr><th>#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Gross</th><th>TO</th><th>Disc</th><th>Extra</th><th>Bons</th><th>V4GST</th><th>GST</th><th>Net Amt</th></tr></thead>
          <tbody>
          ${rows.join("")}
          </tbody>
        </table>
        <div style="margin-top:12px; font-size:12px; display:flex; justify-content:flex-end;">
          <div style="min-width:280px;">
            <div style="display:flex; justify-content:space-between;"><span>Total Amount:</span><strong>${totalAmount.toFixed(2)}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Extra Disc (${extraDiscPer}%):</span><span>${extraDiscAmt.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Adv Tax (${advTaxPer}%):</span><span>${advTaxAmt.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>W.H Tax (${whTaxPer}%):</span><span>${whTaxAmt.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Expense:</span><span>${expense.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; border-top:1px solid #ccc; padding-top:4px;"><span><strong>Grand Total:</strong></span><strong>${calculatedGrandTotal.toFixed(2)}</strong></div>
          </div>
        </div>
        <div style="margin-top:16px;text-align:center;font-size:13px;font-weight:600;">Thank you for bussiness with us</div>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  async function markRequestRead(id) {
    try {
      await apiFetch(`/inventory/transactions/${id}/mark-read`, { method: "PUT", body: {} });
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Failed to open request");
    }
  }

  async function updateRequestStatus(id, status) {
    try {
      const mappedStatus = mapRequestStatusForApi(status);
      await apiFetch(`/inventory/transactions/${id}/request-status`, { method: "PUT", body: { status: mappedStatus } });
      toast.success(`Request ${String(mapRequestStatusForApi(status) || "").toLowerCase()} successfully.`);
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Failed to update request status");
    }
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this record?")) {
      toast.info("Delete cancelled.");
      return;
    }
    try {
      await apiFetch(`/inventory/transactions/${id}`, { method: "DELETE" });
      setTransactions((prev) => prev.filter((r) => r._id !== id));
      toast.success("Record deleted.");
    } catch (e) {
      toast.error(e.message || "Failed to delete record");
    }
  }

  async function updateMinStock(productDbId, value) {
    const product = products.find((p) => p._id === productDbId);
    if (!product) return;
    try {
      await apiFetch(`/products/${productDbId}`, {
        method: "PUT",
        body: { ...product, minStockLevel: Number(value || 0) },
      });
      toast.success("Minimum stock updated.");
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Failed to update minimum stock");
    }
  }

  async function openSummaryDetail(row) {
    setSummaryDetailModal(row);
    setSummaryDetailRows([]);
    setSummaryDetailLoading(true);
    try {
      const data = await apiFetch(`/inventory/summary-detail?productId=${encodeURIComponent(row._id.productId)}&warehouseId=${encodeURIComponent(row._id.warehouseId)}`);
      setSummaryDetailRows(data.rows || []);
    } catch (e) {
      toast.error(e.message || "Failed to load stock details");
    } finally {
      setSummaryDetailLoading(false);
    }
  }

  async function removeSummaryBatch(batchRow) {
    if (!summaryDetailModal) return;
    if (!confirm("Remove this batch quantity from stock?")) return;

    const product = products.find((p) => p.productId === summaryDetailModal._id.productId);
    const warehouse = warehouses.find((w) => w.warehouseId === summaryDetailModal._id.warehouseId);
    if (!product || !warehouse) {
      toast.error("Product or warehouse not found");
      return;
    }

    setSummaryDetailRemoving(true);
    try {
      await apiFetch("/inventory/transactions", {
        method: "POST",
        body: {
          transactionType: "DAMAGE_STOCK",
          warehouseId: warehouse.warehouseId,
          warehouseName: warehouse.name,
          fromEntityName: warehouse.name,
          toEntityName: "Damage Stock",
          note: `Removed from Stock Summary detail (${batchRow.expiryDate ? new Date(batchRow.expiryDate).toLocaleDateString() : "No expiry"})`,
          items: [{
            productId: product.productId,
            productName: product.name,
            cartonSize: `1x${batchRow.quantity}`,
            cartons: 1,
            totalPacks: Number(batchRow.quantity || 0),
            packsPerCarton: Number(batchRow.quantity || 0),
            unitPrice: Number(product.wholesalePrice || 0),
            onePackPrice: Number(product.wholesalePrice || 0),
            oneCartonPrice: Number(product.wholesalePrice || 0),
            totalPrice: Number(product.wholesalePrice || 0) * Number(batchRow.quantity || 0),
            manufactureDate: batchRow.manufactureDate,
            expiryDate: batchRow.expiryDate,
          }],
        },
      });
      toast.success("Batch removed and logged in Damage Stock ledger.");
      await openSummaryDetail(summaryDetailModal);
      await loadAll();
    } catch (e) {
      toast.error(e.message || "Failed to remove stock batch");
    } finally {
      setSummaryDetailRemoving(false);
    }
  }

  return (
    <AdminShell title="Warehouse & Inventory" user={null}>
      <ToastContainer position="top-right" autoClose={2500} />
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Warehouse & Inventory Module</h2>
          <div className="grid md:grid-cols-4 gap-2 mt-3">
            {cards.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedCard(c.key)}
                className={`rounded-lg border p-2 text-left text-sm ${selectedCard === c.key ? "bg-emerald-50 border-emerald-300" : "hover:bg-zinc-50"}`}
              >
                <span>{c.title}</span>
                {c.key === "LOW_STOCK" && lowStock.length > 0 ? <span className="ml-2 inline-block rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Alert</span> : null}
              </button>
            ))}
          </div>
        </section>

        {["PURCHASING_STOCK", "SALE_STOCK", "DAMAGE_STOCK", "RETURN_STOCK"].includes(selectedCard) ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedCard === "PURCHASING_STOCK" ? (
                <>
                  <Input label="From" value={form.fromEntityName} onChange={(v) => setField("fromEntityName", v)} />
                  <Select
                    label="To (Warehouse)"
                    value={form.toWarehouseId}
                    onChange={(v) => setField("toWarehouseId", v)}
                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                  />
                </>
              ) : null}

              {selectedCard === "SALE_STOCK" ? (
                <>
                  <div className="md:col-span-2 flex gap-2">
                    {saleModes.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSaleMode(m.key)}
                        className={`rounded border px-2 py-1 text-xs ${saleMode === m.key ? "bg-emerald-50 border-emerald-300" : ""}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="text-sm font-semibold">From</div>
                    <div className="text-sm font-semibold">To</div>

                    <div>
                      <Select
                        label="From (Warehouse)"
                        value={form.warehouseId}
                        onChange={(v) => setField("warehouseId", v)}
                        options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <Select
                        label="Region"
                        value={form.regionId}
                        onChange={(v) => setField("regionId", v)}
                        options={regions.map((r) => ({ value: r._id, label: r.name }))}
                      />
                      <Select
                        label="Zone"
                        value={form.zoneId}
                        onChange={(v) => setField("zoneId", v)}
                        options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))}
                      />
                      <Select
                        label="Territory"
                        value={form.territoryName}
                        onChange={(v) => setField("territoryName", v)}
                        options={territoriesForZone.map((t) => ({ value: t, label: t }))}
                      />

                      {saleMode === "brand" ? (
                        <>
                          <Select
                            label="Field"
                            value={form.fieldId || ""}
                            onChange={(v) => setField("fieldId", v)}
                            options={fieldsForTerritory.map((f) => ({ value: f._id, label: f.name }))}
                          />
                          <Select
                            label="Business Name"
                            value={form.businessUserId}
                            onChange={(v) => setField("businessUserId", v)}
                            options={brandBusinessUsers.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))}
                          />
                          <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                        </>
                      ) : null}

                      {saleMode === "distributor" ? (
                        <>
                          <Select
                            label="Distributor"
                            value={form.distributorUserId}
                            onChange={(v) => setField("distributorUserId", v)}
                            options={distributorsForTerritory.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))}
                          />
                          <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                        </>
                      ) : null}

                      {saleMode === "subDistributor" ? (
                        <>
                          <Input label="Sub-distributor name" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
                          <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}

              {selectedCard === "DAMAGE_STOCK" ? (
                <Select
                  label="Warehouse"
                  value={form.warehouseId}
                  onChange={(v) => setField("warehouseId", v)}
                  options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                />
              ) : null}

              {selectedCard === "RETURN_STOCK" ? (
                <>
                  <div className="md:col-span-2 flex gap-2">
                    {returnStockModes.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setReturnStockMode(m.key)}
                        className={`rounded border px-2 py-1 text-xs ${returnStockMode === m.key ? "bg-emerald-50 border-emerald-300" : ""}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-sm font-semibold">From</div>
                  <div className="text-sm font-semibold">To</div>

                  <Select
                    label="Region"
                    value={form.regionId}
                    onChange={(v) => setField("regionId", v)}
                    options={regions.map((r) => ({ value: r._id, label: r.name }))}
                  />
                  <Select
                    label="Warehouse"
                    value={form.toWarehouseId}
                    onChange={(v) => setField("toWarehouseId", v)}
                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                  />

                  <Select
                    label="Zone"
                    value={form.zoneId}
                    onChange={(v) => setField("zoneId", v)}
                    options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))}
                  />
                  <div />

                  <Select
                    label="Territory"
                    value={form.territoryName}
                    onChange={(v) => setField("territoryName", v)}
                    options={territoriesForZone.map((t) => ({ value: t, label: t }))}
                  />
                  <div />

                  {returnStockMode === "distributor" ? (
                    <Select
                      label="Distributor Name"
                      value={form.distributorUserId}
                      onChange={(v) => setField("distributorUserId", v)}
                      options={distributorsForTerritory.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))}
                    />
                  ) : (
                    <>
                      <Select
                        label="Field Name"
                        value={form.fieldId || ""}
                        onChange={(v) => setField("fieldId", v)}
                        options={fieldsForTerritory.map((f) => ({ value: f._id, label: f.name }))}
                      />
                      <Select
                        label="Bussiness Type"
                        value={form.businessType}
                        onChange={(v) => setField("businessType", v)}
                        options={businessTypes.map((x) => ({ value: x, label: x }))}
                      />
                      <Select
                        label="Bussiness Name"
                        value={form.businessUserId}
                        onChange={(v) => setField("businessUserId", v)}
                        options={brandBusinessUsers.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))}
                      />
                    </>
                  )}
                </>
              ) : null}

              <div className="md:col-span-2">
                <div className="font-semibold text-sm mb-2">Product Detail</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead>
                      <tr className="border-b bg-zinc-50">
                        <th className="p-2">S.No</th>
                        <th className="p-2">Product Name</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Qty</th>
                        <th className="p-2">Rate</th>
                        <th className="p-2">Gross</th>
                        <th className="p-2">TO</th>
                        <th className="p-2">Disc</th>
                        <th className="p-2">Extra</th>
                        <th className="p-2">Bons</th>
                        <th className="p-2">V4GST</th>
                        <th className="p-2">GST</th>
                        <th className="p-2">Net Amt</th>
                        {["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard) ? <th className="p-2">MFG Date</th> : null}
                        {["PURCHASING_STOCK", "DAMAGE_STOCK", "RETURN_STOCK"].includes(selectedCard) ? <th className="p-2">EXP Date</th> : null}
                        {selectedCard === "RETURN_STOCK" ? <th className="p-2">Return Date</th> : null}
                        <th className="p-2">-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineRows.map(({ idx, line, product, calc }) => (
                        <tr key={idx} className="border-b">
                          <td className="p-1 text-center">{idx + 1}</td>
                          <td className="p-1 min-w-[180px]"><SelectBare value={line.productId} onChange={(v) => setItem(idx, "productId", v)} options={products.map((p) => ({ value: p._id, label: p.name }))} /></td>
                          <td className="p-1 min-w-[140px]"><InputBare value={calc.sizeText} readOnly /></td>
                          <td className="p-1"><InputBare type="number" value={line.qty} onChange={(v) => setItem(idx, "qty", v)} /></td>
                          <td className="p-1"><InputBare type="number" value={calc.rate} readOnly /></td>
                          <td className="p-1"><InputBare type="number" value={calc.gross.toFixed(2)} readOnly /></td>
                          <td className="p-1"><InputBare type="number" value={line.toValue} onChange={(v) => setItem(idx, "toValue", v)} /></td>
                          <td className="p-1"><InputBare type="number" value={line.discValue || String(product?.discountPer || 0)} onChange={(v) => setItem(idx, "discValue", v)} /></td>
                          <td className="p-1"><InputBare type="number" value={line.extraValue} onChange={(v) => setItem(idx, "extraValue", v)} /></td>
                          <td className="p-1"><InputBare type="number" value={line.bonsValue} onChange={(v) => setItem(idx, "bonsValue", v)} /></td>
                          <td className="p-1"><InputBare type="number" value={calc.v4gst.toFixed(2)} readOnly /></td>
                          <td className="p-1"><InputBare type="number" value={line.gstPer} onChange={(v) => setItem(idx, "gstPer", v)} /></td>
                          <td className="p-1"><InputBare type="number" value={calc.netAmt.toFixed(2)} readOnly /></td>
                          {["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard) ? (
                            <td className="p-1"><InputBare type="date" value={line.manufactureDate} onChange={(v) => setItem(idx, "manufactureDate", v)} /></td>
                          ) : null}
                          {["PURCHASING_STOCK", "DAMAGE_STOCK", "RETURN_STOCK"].includes(selectedCard) ? (
                            <td className="p-1"><InputBare type="date" value={line.expiryDate} onChange={(v) => setItem(idx, "expiryDate", v)} /></td>
                          ) : null}
                          {selectedCard === "RETURN_STOCK" ? (
                            <td className="p-1"><InputBare type="date" value={line.returnDate || ""} onChange={(v) => setItem(idx, "returnDate", v)} /></td>
                          ) : null}
                          <td className="p-1"><button type="button" className="rounded border px-2 py-1" onClick={() => removeItem(idx)}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={addItem}>+ Add product</button>

                <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                  <div className="rounded border p-3 space-y-2">
                    <div>Total amount: <strong>{totalAmount.toFixed(2)}</strong></div>
                    <div className="grid grid-cols-3 gap-2 items-center"><span>Extra Disc (%)</span><InputBare type="number" value={form.extraDiscPer} onChange={(v) => setField("extraDiscPer", v)} /><span>{extraDiscAmt.toFixed(2)}</span></div>
                    <div className="grid grid-cols-3 gap-2 items-center"><span>Adv Tax (%)</span><InputBare type="number" value={form.advTaxPer} onChange={(v) => setField("advTaxPer", v)} /><span>{advTaxAmt.toFixed(2)}</span></div>
                    <div className="grid grid-cols-3 gap-2 items-center"><span>W.H Tax (%)</span><InputBare type="number" value={form.whTaxPer} onChange={(v) => setField("whTaxPer", v)} /><span>{whTaxAmt.toFixed(2)}</span></div>
                    <div className="grid grid-cols-3 gap-2 items-center"><span>Expense</span><InputBare type="number" value={form.expense} onChange={(v) => setField("expense", v)} /><span>{toNum(form.expense).toFixed(2)}</span></div>
                  </div>
                  <div className="rounded border p-3 text-right">
                    <div className="text-lg font-semibold">Grand Total: {grandTotal.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <button disabled={saving || loading} className="rounded bg-zinc-900 text-white px-4 py-2">{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </section>
        ) : null}

        {selectedCard === "DAMAGE_STOCK" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Near to expire products</h3>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b"><th className="p-2 text-left">Product Name</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Manufactur date</th><th className="p-2 text-left">expiry date</th></tr>
                </thead>
                <tbody>
                  {nearExpiry.map((r, idx) => (
                    <tr key={idx} className="border-b"><td className="p-2">{r.productName}</td><td className="p-2">{r.quantity}</td><td className="p-2">{r.warehouseName}</td><td className="p-2">{r.manufactureDate ? new Date(r.manufactureDate).toLocaleDateString() : "-"}</td><td className="p-2">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {selectedCard === "W2W_TRANSFER" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold">Warehouse to Warehouse Transfer</h3>
            <form onSubmit={submitTransfer} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Product"
                value={transferForm.productId}
                onChange={(v) => setTransferField("productId", v)}
                options={products.map((p) => ({ value: p._id, label: p.name }))}
              />
              <Input label="Quantity" type="number" value={transferForm.quantity} onChange={(v) => setTransferField("quantity", v)} />
              <Select
                label="From Warehouse"
                value={transferForm.fromWarehouseId}
                onChange={(v) => setTransferField("fromWarehouseId", v)}
                options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
              />
              <Select
                label="To Warehouse"
                value={transferForm.toWarehouseId}
                onChange={(v) => setTransferField("toWarehouseId", v)}
                options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
              />
              <Select
                label="Status"
                value={transferForm.status}
                onChange={(v) => setTransferField("status", v)}
                options={transferStatuses.map((s) => ({ value: s, label: s }))}
              />
              <Input label="Note" value={transferForm.note} onChange={(v) => setTransferField("note", v)} />
              <div className="md:col-span-2"><button disabled={transferSaving || loading} className="rounded bg-zinc-900 text-white px-4 py-2">{transferSaving ? "Saving..." : "Create Transfer"}</button></div>
            </form>
            <TransferTable rows={transfers} onEditStatus={editTransferStatus} onDelete={deleteTransfer} onReceipt={printTransferReceipt} />
          </section>
        ) : null}
        {selectedCard === "STOCK_SUMMARY" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Stock Summary</h3>
            <div className="mt-2 max-w-sm">
              <Select
                label="Warehouse Filter"
                value={summaryWarehouseFilter}
                onChange={setSummaryWarehouseFilter}
                options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))}
              />
            </div>
            <SummaryTable rows={filteredSummary} products={products} onUpdateMin={updateMinStock} onDetail={openSummaryDetail} />
          </section>
        ) : null}
        {selectedCard === "LOW_STOCK" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Low Stock Alert</h3>
            <div className="mt-2 max-w-sm">
              <Select
                label="Warehouse Filter"
                value={lowStockWarehouseFilter}
                onChange={setLowStockWarehouseFilter}
                options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))}
              />
            </div>
            <LowStockTable rows={filteredLowStock} />
          </section>
        ) : null}

        {selectedCard === "INVENTORY_LEDGER" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Inventory Ledger</h3>
            <div className="mt-2 grid md:grid-cols-3 gap-3">
              <Select
                label="Warehouse Filter"
                value={ledgerWarehouseFilter}
                onChange={setLedgerWarehouseFilter}
                options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))}
              />
              <Select
                label="Movement Type"
                value={ledgerMovementTypeFilter}
                onChange={setLedgerMovementTypeFilter}
                options={["PURCHASE_IN", "TRANSFER_IN", "TRANSFER_OUT", "SALE_OUT", "RETURN_IN", "ADJUSTMENT"].map((x) => ({ value: x, label: x }))}
              />
              <Input label="Search" value={ledgerSearch} onChange={setLedgerSearch} />
            </div>
            <InventoryMovementTable rows={filteredMovements} />
          </section>
        ) : null}

        {selectedCard === "SALE_STOCK" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Order requests list</h3>
            <RequestOrderStocksTable
              rows={saleStockRequests}
              onOpen={markRequestRead}
              onApprove={(id) => updateRequestStatus(id, "APPROVED")}
              onReject={(id) => updateRequestStatus(id, "REJECTED")}
              onDispatch={(id) => updateRequestStatus(id, "DISPATCHED")}
              onDelivered={(id) => updateRequestStatus(id, "DELIVERED")}
              onPreview={(row) => setPreviewRequest(row)}
            />
          </section>
        ) : null}

        {selectedCard === "RETURN_STOCK" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Requests Return Stocks</h3>
            <RequestReturnStocksTable
              rows={returnStockRequests}
              onOpen={markRequestRead}
              onApprove={(id) => updateRequestStatus(id, "APPROVED")}
              onReject={(id) => updateRequestStatus(id, "REJECTED")}
              onPreview={(row) => setPreviewRequest(row)}
            />
          </section>
        ) : null}

        {["PURCHASING_STOCK", "SALE_STOCK", "DAMAGE_STOCK", "RETURN_STOCK"].includes(selectedCard) ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{cards.find((c) => c.key === selectedCard)?.title} Ledger</h3>
            {selectedCard === "SALE_STOCK" ? (
              <div className="mt-2 flex gap-2">
                {saleLedgerFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setSaleLedgerFilter(f.key)}
                    className={`rounded border px-2 py-1 text-xs ${saleLedgerFilter === f.key ? "bg-emerald-50 border-emerald-300" : ""}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedCard === "RETURN_STOCK" ? (
              <div className="mt-2 flex gap-2">
                {returnStockLedgerFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setReturnStockLedgerFilter(f.key)}
                    className={`rounded border px-2 py-1 text-xs ${returnStockLedgerFilter === f.key ? "bg-emerald-50 border-emerald-300" : ""}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
            <LedgerTable type={selectedCard} rows={cardTx} onDelete={deleteRecord} onInvoice={printInvoice} />
          </section>
        ) : null}
        <RequestPreviewModal row={previewRequest} onClose={() => setPreviewRequest(null)} />
        <SummaryDetailModal
          row={summaryDetailModal}
          rows={summaryDetailRows}
          loading={summaryDetailLoading}
          removing={summaryDetailRemoving}
          onClose={() => setSummaryDetailModal(null)}
          onRemove={removeSummaryBatch}
        />
      </div>
    </AdminShell>
  );
}

function LedgerTable({ type, rows, onDelete, onInvoice }) {
  const purchase = type === "PURCHASING_STOCK";
  const sale = type === "SALE_STOCK";
  const returnStock = type === "RETURN_STOCK";
  return (
    <div className="overflow-x-auto mt-2">
      <table className="min-w-full text-sm">
        <thead>
          {purchase ? (
            <tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Grand Total</th><th className="p-2 text-left">Action</th></tr>
          ) : sale || returnStock ? (
            <tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Distributor Name</th><th className="p-2 text-left">Bussiness Name</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Action</th></tr>
          ) : (
            <tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Action</th></tr>
          )}
        </thead>
        <tbody>
          {rows.map((r) => {
            const requestStatus = normalizeRequestStatus(r.requestStatus || "");
            const fromRequester = isSaleOrderRequest(r) || ["Brand Manager", "Distributor"].includes(String(r.requestSourceRole || ""));
            const rowClass = (sale || returnStock) && fromRequester ? requestRowClass(requestStatus) : "border-b";
            return (
            <tr key={r._id} className={rowClass}>
              <td className="p-2">{r.transactionCode}</td>
              {purchase ? <><td className="p-2">{r.fromEntityName || "-"}</td><td className="p-2">{r.toEntityName || "-"}</td></> : null}
              {sale ? <><td className="p-2">{r.fromEntityName || "-"}</td><td className="p-2">{r.distributorName || "-"}</td><td className="p-2">{r.brandName || r.toEntityName || "-"}</td></> : null}
              {returnStock ? <><td className="p-2">{r.fromEntityName || "-"}</td><td className="p-2">{String(r.fromEntityType || "").toUpperCase() === "DISTRIBUTOR" ? (r.distributorName || r.fromEntityName || "-") : "-"}</td><td className="p-2">{String(r.fromEntityType || "").toUpperCase() === "BRAND" ? (r.brandName || r.fromEntityName || "-") : "-"}</td></> : null}
              <td className="p-2">{new Date(r.transactionAt).toLocaleString()}</td>
              <td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={() => onInvoice(r)}>Invoice/Receipt</button><button className="rounded border border-red-300 text-red-700 px-2 py-1" onClick={() => onDelete(r._id)}>Delete</button></div></td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RequestOrderStocksTable({ rows, onOpen, onApprove, onReject, onDispatch, onDelivered, onPreview }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">From</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Date and Time</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Unread</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const status = normalizeRequestStatus(r.requestStatus || "PENDING");
            const unread = !r.requestReadAt;
            return (
              <tr key={r._id} className="border-b">
                <td className="p-2">{r.transactionCode}</td>
                <td className="p-2">{r.fromEntityName || "-"}</td>
                <td className="p-2">{sourceRoleLabel(r)}</td>
                <td className="p-2">{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : "-"}</td>
                <td className="p-2">{status}</td>
                <td className="p-2">{unread ? <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Unread</span> : "Read"}</td>
                <td className="p-2"><div className="flex gap-2 flex-wrap"><button className="rounded border px-2 py-1" onClick={() => onOpen(r._id)}>Open</button><button className="rounded border border-emerald-300 px-2 py-1 text-emerald-700" onClick={() => onPreview(r)}>Preview</button><button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => onReject(r._id)}>Reject</button><button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={() => onApprove(r._id)}>Approve</button><button className="rounded border border-indigo-300 px-2 py-1 text-indigo-700" onClick={() => onDispatch(r._id)}>Dispatch</button><button className="rounded border border-emerald-500 px-2 py-1 text-emerald-800" onClick={() => onDelivered(r._id)}>Delivered</button></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RequestReturnStocksTable({ rows, onOpen, onApprove, onReject, onPreview }) {
  return (
    <div className="overflow-x-auto mt-2">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">From</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Date and Time</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Unread</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const status = normalizeRequestStatus(r.requestStatus || "APPROVED");
            const unread = !r.requestReadAt;
            return (
              <tr key={r._id} className="border-b">
                <td className="p-2">{r.transactionCode}</td>
                <td className="p-2">{r.fromEntityName || "-"}</td>
                <td className="p-2">{sourceRoleLabel(r)}</td>
                <td className="p-2">{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : "-"}</td>
                <td className="p-2">{status}</td>
                <td className="p-2">{unread ? <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Unread</span> : "Read"}</td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button className="rounded border px-2 py-1" onClick={() => onOpen(r._id)}>Open</button>
                    <button className="rounded border border-emerald-300 px-2 py-1 text-emerald-700" onClick={() => onPreview(r)}>Preview</button>
                    {status === "PENDING" ? (
                      <>
                        <button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={() => onApprove(r._id)}>Approve</button>
                        <button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => onReject(r._id)}>Reject</button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function RequestPreviewModal({ row, onClose }) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <div className="text-lg font-semibold">Order Request Preview</div>
            <div className="text-sm text-zinc-500">{row.transactionCode || "-"}</div>
          </div>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PreviewField label="From" value={row.fromEntityName || "-"} />
            <PreviewField label="Source" value={sourceRoleLabel(row)} />
            <PreviewField label="Region" value={row.regionName || row.regionId || "-"} />
            <PreviewField label="Zone" value={row.zoneName || row.zoneId || "-"} />
            <PreviewField label="Territory" value={row.territory || "-"} />
            <PreviewField label="To" value={row.toEntityName || row.warehouseName || "-"} />
            <div className="md:col-span-2">
              <PreviewField label="Address" value={row.note || "-"} />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Product</th>
                  <th className="px-3 py-2 text-left border-b">Quantity</th>
                  <th className="px-3 py-2 text-left border-b">Manufacture Date</th>
                  <th className="px-3 py-2 text-left border-b">Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {(row.items || []).map((item, idx) => (
                  <tr key={`${item.productId || item.productName}-${idx}`} className="border-b">
                    <td className="px-3 py-2">{item.productName || item.productId || "-"}</td>
                    <td className="px-3 py-2">{item.totalPacks ?? item.qty ?? "-"}</td>
                    <td className="px-3 py-2">{item.manufactureDate ? new Date(item.manufactureDate).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 rounded border bg-zinc-50 px-3 py-2 text-sm">{value || "-"}</div>
    </div>
  );
}

function TransferTable({ rows, onEditStatus, onDelete, onReceipt }) {
  return <div className="overflow-x-auto mt-2"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Qty</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Action</th></tr></thead><tbody>{rows.map((r)=><tr key={r._id} className="border-b"><td className="p-2">{r.productName}</td><td className="p-2">{r.fromWarehouseName}</td><td className="p-2">{r.toWarehouseName}</td><td className="p-2">{r.quantity}</td><td className="p-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td><td className="p-2">{r.status}</td><td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={()=>onReceipt(r)}>Receipt</button><button className="rounded border px-2 py-1" onClick={()=>onEditStatus(r)}>Edit</button><button className="rounded border border-red-300 text-red-700 px-2 py-1" onClick={()=>onDelete(r._id)}>Delete</button></div></td></tr>)}</tbody></table></div>;
}

function InventoryMovementTable({ rows }) {
  return <div className="overflow-x-auto mt-3"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Date</th><th className="p-2 text-left">Product</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Reference</th></tr></thead><tbody>{rows.map((r)=><tr key={r._id} className="border-b"><td className="p-2">{new Date(r.createdAt).toLocaleString()}</td><td className="p-2">{r.productName}</td><td className="p-2">{r.warehouseName}</td><td className="p-2">{r.quantity}</td><td className="p-2">{r.movementType}</td><td className="p-2">{r.referenceId || "-"}</td></tr>)}</tbody></table></div>;
}

function SummaryTable({ rows, products, onUpdateMin, onDetail }) {
  const [edits, setEdits] = useState({});
  return <div className="overflow-x-auto mt-2"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Minimum Stock Level</th><th className="p-2 text-left">Action</th></tr></thead><tbody>{rows.map((r)=>{const p=products.find((x)=>x.productId===r._id.productId);return <tr key={`${r._id.productId}-${r._id.warehouseId}`} className="border-b"><td className="p-2">{r.productName}</td><td className="p-2">{r.warehouseName}</td><td className="p-2">{r.quantity}</td><td className="p-2"><input className="border rounded px-2 py-1 w-24" value={edits[p?._id] ?? p?.minStockLevel ?? 0} onChange={(e)=>setEdits((s)=>({...s,[p?._id]:e.target.value}))} /></td><td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={()=>p&&onUpdateMin(p._id,edits[p._id] ?? p.minStockLevel)}>Update</button><button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={()=>onDetail(r)}>Detail</button></div></td></tr>;})}</tbody></table></div>;
}

function SummaryDetailModal({ row, rows, loading, removing, onClose, onRemove }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div><div className="text-lg font-semibold">Stock Detail</div><div className="text-sm text-zinc-500">{row.productName} - {row.warehouseName}</div></div>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-5">
          {loading ? <div className="text-sm text-zinc-500">Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Manufacture Date</th><th className="p-2 text-left">Expiry Date</th><th className="p-2 text-left">Action</th></tr></thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={`${idx}-${r.manufactureDate}-${r.expiryDate}`} className="border-b">
                      <td className="p-2">{r.productName || row.productName}</td>
                      <td className="p-2">{r.quantity}</td>
                      <td className="p-2">{r.manufactureDate ? new Date(r.manufactureDate).toLocaleDateString() : "-"}</td>
                      <td className="p-2">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}</td>
                      <td className="p-2"><button disabled={removing} className="rounded border border-red-300 px-2 py-1 text-red-700 disabled:opacity-50" onClick={() => onRemove(r)}>Remove</button></td>
                    </tr>
                  ))}
                  {!rows.length ? <tr><td className="p-2 text-zinc-500" colSpan={5}>No batch details found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LowStockTable({ rows }) {
  return <div className="overflow-x-auto mt-2"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Min Level</th></tr></thead><tbody>{rows.map((r,idx)=><tr key={idx} className="border-b"><td className="p-2">{r.name}</td><td className="p-2">{r.warehouseName}</td><td className="p-2">{r.quantity}</td><td className="p-2">{r.minStockLevel}</td></tr>)}</tbody></table></div>;
}

function Input({ label, value, onChange, type = "text", readOnly = false }) {
  return <label className="text-sm"><span className="text-zinc-600">{label}</span><input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="text-sm"><span className="text-zinc-600">{label}</span><select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function InputBare({ value, onChange = () => {}, type = "text", readOnly = false, className = "" }) {
  return <input className={`w-full min-w-[82px] border rounded px-2 py-1 ${className}`} type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />;
}

function SelectBare({ value, onChange, options, className = "" }) {
  return <select className={`w-full min-w-[220px] border rounded px-2 py-1 ${className}`} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}