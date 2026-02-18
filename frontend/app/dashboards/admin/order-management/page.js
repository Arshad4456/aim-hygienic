"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const emptyItem = {
  productId: "",
  qty: "",
  toValue: "0",
  discValue: "0",
  extraValue: "0",
  bonsValue: "0",
  gstPer: "0",
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
  return { sizeText: product?.size || "-", qty, rate, gross, discValue, v4gst, gstAmount, netAmt };
}

const modeConfig = {
  primary: {
    title: "Primary Orders",
    saleType: "primary",
  },
  secondary: {
    title: "Secondary Orders",
    saleType: "secondary",
    sourceOptions: [
      { value: "order_booker", label: "Order Booker" },
      { value: "customer", label: "Customer" },
    ],
  },
};

const primarySaleModes = [
  { key: "brand", label: "Brand" },
  { key: "distributor", label: "Distributor" },
  { key: "subDistributor", label: "Sub-Distributor" },
];

export default function OrderManagementModulePage() {
  const [activeMode, setActiveMode] = useState("");
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toastState, setToastState] = useState(null);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [form, setForm] = useState({
    sourceType: "brand",
    primarySaleMode: "brand",
    businessType: "",
    businessName: "",
    businessUserId: "",
    distributorUserId: "",
    fieldId: "",
    distributorName: "",
    subDistributorName: "",
    customerName: "",
    toWarehouseId: "",
    regionId: "",
    zoneId: "",
    territoryName: "",
    address: "",
    extraDiscPer: "0",
    advTaxPer: "0",
    whTaxPer: "0",
    expense: "0",
    items: [{ ...emptyItem }],
  });

  const selectedRegion = useMemo(() => regions.find((item) => item._id === form.regionId), [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((item) => item._id === form.zoneId), [zones, form.zoneId]);
  const brandManagers = useMemo(() => users.filter((u) => u.role === "Brand Manager"), [users]);
  const distributors = useMemo(() => users.filter((u) => u.role === "Distributor"), [users]);
  const zonesForRegion = useMemo(() => {
    const region = regions.find((r) => r._id === form.regionId);
    return region ? zones.filter((z) => z.regionId === region.regionId) : [];
  }, [regions, zones, form.regionId]);
  const territoriesForZone = useMemo(() => {
    const zone = zones.find((z) => z._id === form.zoneId);
    if (!zone) return [];
    const fromUsers = users
      .filter((u) => u.zoneId === zone.zoneId || u.zoneName === zone.name)
      .map((u) => u.territoryName)
      .filter(Boolean);
    const fromFields = fields
      .filter((f) => f.zoneId === zone.zoneId || f.zoneName === zone.name)
      .map((f) => f.territoryName || f.areaName)
      .filter(Boolean);
    return [...new Set([...fromUsers, ...fromFields])];
  }, [zones, users, fields, form.zoneId]);
  const fieldsForTerritory = useMemo(() => {
    return fields.filter((f) => {
      const regionMatch = !form.regionId || f.regionId === (regions.find((r) => r._id === form.regionId)?.regionId || "");
      const zoneMatch = !form.zoneId || f.zoneId === (zones.find((z) => z._id === form.zoneId)?.zoneId || "");
      const territoryMatch = !form.territoryName || f.territoryName === form.territoryName || f.areaName === form.territoryName;
      return regionMatch && zoneMatch && territoryMatch;
    });
  }, [fields, form.regionId, form.zoneId, form.territoryName, regions, zones]);
  const brandBusinessUsers = useMemo(() => {
    const selectedField = fieldsForTerritory.find((f) => f._id === form.fieldId);
    return brandManagers.filter((u) => !selectedField || u.fieldId === selectedField.fieldId || u.fieldName === selectedField.name);
  }, [brandManagers, fieldsForTerritory, form.fieldId]);
  const distributorsForTerritory = useMemo(
    () => distributors.filter((d) => !form.territoryName || d.territoryName === form.territoryName),
    [distributors, form.territoryName],
  );
  const selectedBrandManager = useMemo(() => brandBusinessUsers.find((u) => u._id === form.businessUserId), [brandBusinessUsers, form.businessUserId]);
  const selectedDistributor = useMemo(
    () => distributorsForTerritory.find((u) => u._id === form.distributorUserId),
    [distributorsForTerritory, form.distributorUserId],
  );
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
  const grandTotal = useMemo(() => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + toNum(form.expense), [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense]);

  async function loadData() {
    const [oRes, txRes, wRes, pRes, rRes, zRes, uRes, fRes] = await Promise.all([
      apiFetch("/orders"),
      apiFetch("/inventory/transactions"),
      apiFetch("/warehouses"),
      apiFetch("/products"),
      apiFetch("/regions"),
      apiFetch("/zones"),
      apiFetch("/users"),
      apiFetch("/fields?limit=500"),
    ]);
    setOrders(oRes.orders || []);
    setTransactions(txRes.transactions || []);
    setWarehouses(wRes.warehouses || []);
    setProducts(pRes.products || []);
    setRegions(rRes.regions || []);
    setZones(zRes.zones || []);
    setUsers(uRes.users || []);
    setFields(fRes.fields || []);
  }

  useEffect(() => {
    loadData().catch((e) => notify("error", e.message || "Failed to load order module"));
  }, []);

  useEffect(() => {
    if (!activeMode) return;
    const defaults = modeConfig[activeMode];
    setForm((prev) => ({
      ...prev,
      sourceType: defaults.sourceOptions?.[0]?.value || "brand",
      primarySaleMode: "brand",
    }));
  }, [activeMode]);

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
    if (form.primarySaleMode === "brand") {
      setField("address", selectedBrandManager?.address || "");
      setField("businessName", selectedBrandManager?.businessName || selectedBrandManager?.fullName || "");
    } else if (form.primarySaleMode === "distributor") {
      const name = selectedDistributor?.businessName || selectedDistributor?.fullName || "";
      setField("address", selectedDistributor?.address || "");
      setField("distributorName", name);
    }
  }, [form.primarySaleMode, selectedBrandManager, selectedDistributor]);


  const saleOrderRequests = useMemo(
    () =>
      transactions
        .filter((t) => t.transactionType === "SALE_STOCK")
        .filter((t) => ["Brand Manager", "Distributor"].includes(String(t.requestSourceRole || "")))
        .sort((a, b) => new Date(b.transactionAt || 0).getTime() - new Date(a.transactionAt || 0).getTime()),
    [transactions],
  );

  const filteredOrders = useMemo(() => {
    if (!activeMode) return [];
    if (activeMode === "primary") {
      return transactions.filter((t) => t.transactionType === "SALE_STOCK");
    }
    return orders.filter((order) => order.saleType === modeConfig[activeMode].saleType);
  }, [activeMode, orders, transactions]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!activeMode) return;
    setSaving(true);
    try {
      const targetWarehouse = warehouses.find((item) => item._id === form.toWarehouseId);
      const selectedField = fieldsForTerritory.find((f) => f._id === form.fieldId);
      const primaryCustomerName =
        form.primarySaleMode === "brand"
          ? selectedBrandManager?.businessName || selectedBrandManager?.fullName || form.businessName
          : form.primarySaleMode === "distributor"
            ? selectedDistributor?.businessName || selectedDistributor?.fullName || form.distributorName
            : form.subDistributorName;
      const customerName = activeMode === "primary" ? primaryCustomerName : form.customerName;

      if (!targetWarehouse || !customerName?.trim()) {
        throw new Error("Customer/source name and warehouse are required");
      }

      if (activeMode === "primary") {
        const normalizedItems = lineRows
          .filter((r) => r.product && r.calc.qty > 0)
          .map((r) => ({
            productId: r.product.productId,
            productName: r.product.name,
            cartonSize: `1x${r.calc.qty || 0}`,
            quantity: r.calc.qty,
            unitPrice: r.calc.rate,
            amount: r.calc.gross,
            stockValue: r.calc.gross,
            note: `to:${toNum(r.line.toValue)},disc:${toNum(r.line.discValue)},extra:${toNum(r.line.extraValue)},bons:${toNum(r.line.bonsValue)},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
          }));

        if (!normalizedItems.length) {
          throw new Error("Add at least one product row with quantity");
        }

        const region = regions.find((r) => r._id === form.regionId);
        const zone = zones.find((z) => z._id === form.zoneId);
        const body = {
          transactionType: "SALE_STOCK",
          warehouseId: targetWarehouse.warehouseId || "",
          warehouseName: targetWarehouse.name || "",
          adjustment: 0,
          extraDiscPer: Number(form.extraDiscPer || 0),
          advTaxPer: Number(form.advTaxPer || 0),
          whTaxPer: Number(form.whTaxPer || 0),
          expense: Number(form.expense || 0),
          items: normalizedItems,
          subtotal: totalAmount,
          grandTotal,
          fromEntityName: targetWarehouse.name || "",
          regionId: region?.regionId || "",
          regionName: region?.name || "",
          zoneId: zone?.zoneId || "",
          zoneName: zone?.name || "",
          territory: form.territoryName,
          note: form.address,
        };

        if (form.primarySaleMode === "brand") {
          body.toEntityType = "BRAND";
          body.fieldId = form.fieldId;
          body.fieldName = selectedField?.name || "";
          body.toEntityName = selectedBrandManager?.businessName || selectedBrandManager?.fullName || "";
          body.brandName = body.toEntityName;
        } else if (form.primarySaleMode === "distributor") {
          body.toEntityType = "DISTRIBUTOR";
          body.distributorName = selectedDistributor?.businessName || selectedDistributor?.fullName || "";
          body.toEntityName = body.distributorName;
        } else {
          body.toEntityType = "SUB_DISTRIBUTOR";
          body.subDistributorName = form.subDistributorName;
          body.toEntityName = form.subDistributorName;
        }

        await apiFetch("/inventory/transactions", { method: "POST", body });
      } else {
        const items = form.items
          .map((line) => ({ line, product: products.find((p) => p._id === line.productId) }))
          .filter((row) => row.product && Number(row.line.qty) > 0)
          .map(({ line, product }) => ({
            productName: product.name,
            productCode: product.productId,
            quantity: Number(line.qty),
            unitPrice: Number(product.wholesalePrice || 0),
            toValue: Number(line.toValue || 0),
            discValue: Number(line.discValue || 0),
            extraValue: Number(line.extraValue || 0),
            bonsValue: Number(line.bonsValue || 0),
            gstPer: Number(line.gstPer || 0),
          }));

        if (!items.length) {
          throw new Error("Add at least one product row with quantity");
        }

        const sourceType = form.sourceType;
        await apiFetch("/orders", {
          method: "POST",
          body: {
            saleType: modeConfig[activeMode].saleType,
            sourceType,
            customerType: sourceType === "brand" ? "brand" : sourceType,
            customerName,
            fromEntityName: customerName,
            fromEntityRole: modeConfig[activeMode].title,
            toWarehouseId: targetWarehouse.warehouseId || targetWarehouse._id,
            toWarehouseName: targetWarehouse.name,
            regionId: selectedRegion?.regionId || "",
            regionName: selectedRegion?.name || "",
            zoneId: selectedZone?.zoneId || "",
            zoneName: selectedZone?.name || "",
            territoryName: form.territoryName,
            address: form.address,
            items,
            subtotal: totalAmount,
            grandTotal,
            extraDiscPer: Number(form.extraDiscPer || 0),
            advTaxPer: Number(form.advTaxPer || 0),
            whTaxPer: Number(form.whTaxPer || 0),
            expense: Number(form.expense || 0),
          },
        });
      }

      notify("success", `${modeConfig[activeMode].title} request created successfully.`);
      setForm((prev) => ({
        ...prev,
        customerName: "",
        businessType: "",
        businessName: "",
        distributorName: "",
        subDistributorName: "",
        toWarehouseId: "",
        extraDiscPer: "0",
        advTaxPer: "0",
        whTaxPer: "0",
        expense: "0",
        items: [{ ...emptyItem }],
      }));
      await loadData();
    } catch (e) {
      notify("error", e.message || "Failed to submit order request");
    } finally {
      setSaving(false);
    }
  }


  async function deleteOrder(orderId) {
    try {
      await apiFetch(activeMode === "primary" ? `/inventory/transactions/${orderId}` : `/orders/${orderId}`, { method: "DELETE" });
      notify("success", "Order deleted successfully.");
      await loadData();
    } catch (e) {
      notify("error", e.message || "Failed to delete order");
    }
  }

  function notify(type, message) {
    setToastState({ type, message });
    setTimeout(() => setToastState(null), 2500);
  }

  function printOrderInvoice(order) {
    const logo = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
        <div>
          <div style="font-weight:700;font-size:16px;">AIM-HYGIENICS</div>
          <div style="font-size:11px;color:#555;">PVT LIMITED</div>
        </div>
      </div>`;

    const rows = (order.items || []).map((item, idx) => {
      const parts = Object.fromEntries(String(item.notes || "").split(",").map((seg) => seg.split(":")));
      const gross = toNum(parts.gross || item.amount || 0);
      const toVal = toNum(parts.to || item.toValue || 0);
      const disc = toNum(parts.disc || item.discValue || 0);
      const extra = toNum(parts.extra || item.extraValue || 0);
      const bons = toNum(parts.bons || item.bonsValue || 0);
      const v4gst = toNum(parts.v4gst || gross - toVal - disc - extra - bons);
      const gst = toNum(parts.gst || (v4gst * toNum(item.gstPer || 0)) / 100);
      const net = toNum(parts.net || item.totalPrice || v4gst + gst);
      return `<tr><td>${idx + 1}</td><td>${item.productName || "-"}</td><td>${item.totalPacks || item.quantity || 0}</td><td>${item.onePackPrice || item.unitPrice || 0}</td><td>${gross.toFixed(2)}</td><td>${toVal.toFixed(2)}</td><td>${disc.toFixed(2)}</td><td>${extra.toFixed(2)}</td><td>${bons.toFixed(2)}</td><td>${v4gst.toFixed(2)}</td><td>${gst.toFixed(2)}</td><td>${net.toFixed(2)}</td></tr>`;
    });

    const lineTotal = (order.items || []).reduce((sum, item) => {
      const parts = Object.fromEntries(String(item.notes || "").split(",").map((seg) => seg.split(":")));
      const fallbackNet = toNum(item.totalPrice || item.unitPrice) * toNum(item.quantity || item.totalPacks || 1);
      return sum + toNum(parts.net || fallbackNet);
    }, 0);

    const totalAmount = toNum(order.subtotal || lineTotal);
    const extraDiscPer = toNum(order.extraDiscPer);
    const advTaxPer = toNum(order.advTaxPer);
    const whTaxPer = toNum(order.whTaxPer);
    const expense = toNum(order.expense);
    const extraDiscAmt = (totalAmount * extraDiscPer) / 100;
    const advTaxAmt = (totalAmount * advTaxPer) / 100;
    const whTaxAmt = (totalAmount * whTaxPer) / 100;
    const calculatedGrandTotal = totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + expense;

    const rawNote = String(order.note || order.address || "").trim();
    const extractedAddress = (rawNote.match(/Address\s*:\s*(.*)$/i)?.[1] || rawNote).trim();
    const heading = order.transactionType === "DAMAGE_STOCK"
      ? "Damage Stock"
      : order.transactionType === "RETURN_STOCK"
        ? "Return Stock"
        : "Sales Tax Invoice";

    const html = `
      <html>
      <body style="font-family: Arial; padding: 16px; position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;">${logo}<div style="text-align:right;"><div style="font-size:13px;font-weight:700;">${heading}</div></div></div>
        <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:12px;">
          <div>Date: ${new Date(order.transactionAt || order.createdAt || Date.now()).toLocaleDateString()}</div>
          <div>Invoice #: ${order.transactionCode || order.orderNo || "-"}</div>
        </div>
        <div style="margin-top:8px;font-size:12px;">Invoice From: ${order.fromEntityName || order.warehouseName || "-"}</div>
        <div style="font-size:12px;">Bill To: ${order.toEntityName || order.distributorName || order.customerName || "-"}</div>
        <div style="font-size:12px;">Address: ${extractedAddress || "-"}</div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; margin-top:10px; font-size:12px;">
          <thead><tr><th>#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Gross</th><th>TO</th><th>Disc</th><th>Extra</th><th>Bons</th><th>V4GST</th><th>GST</th><th>Net Amt</th></tr></thead>
          <tbody>
          ${rows.join("") || '<tr><td colspan="12">No items</td></tr>'}
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

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      notify("info", "Please allow popups to print invoice/receipt.");
      return;
    }
    popup.document.write(html);
    popup.document.close();
    popup.print();
  }



  async function markRequestRead(id) {
    try {
      await apiFetch(`/inventory/transactions/${id}/mark-read`, { method: "PUT", body: {} });
      await loadData();
    } catch (e) {
      notify("error", e.message || "Failed to open request");
    }
  }

  async function updateSaleRequestStatus(id, status) {
    try {
      await apiFetch(`/inventory/transactions/${id}/request-status`, { method: "PUT", body: { status } });
      notify("success", `Request ${String(status || "").toLowerCase()} successfully.`);
      await loadData();
    } catch (e) {
      notify("error", e.message || "Failed to update request status");
    }
  }

  return (
    <AdminShell title="Order Management" user={null}>
      <div className="space-y-6">
        {toastState ? <InlineToast type={toastState.type} message={toastState.message} /> : null}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Order Management Module Overview</div>
          <div className="text-sm text-zinc-500 mt-1">Choose one workflow card to manage request form and ledger.</div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries(modeConfig).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMode(key)}
                className={`rounded-2xl border p-5 text-left ${activeMode === key ? "border-emerald-300 bg-emerald-50" : "bg-zinc-50 hover:bg-white"}`}
              >
                <div className="text-base font-semibold text-zinc-900">{cfg.title} Card</div>
                <div className="text-xs text-zinc-600 mt-1">Open {cfg.title.toLowerCase()} flow.</div>
              </button>
            ))}
          </div>
        </section>

        {activeMode ? (
          <>
          <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
            <div className="text-lg font-semibold text-zinc-900">{activeMode === "primary" ? "Create Sale Order" : "Secondary Order Request"}</div>
            {activeMode === "primary" ? <div className="text-sm text-zinc-500">Sale Stock functionality with Sale Order Ledger.</div> : null}
            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submitOrder}>
              {activeMode === "primary" ? (
                <>
                  <div className="md:col-span-2 flex gap-2">
                    {primarySaleModes.map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setField("primarySaleMode", mode.key)}
                        className={`rounded border px-2 py-1 text-xs ${form.primarySaleMode === mode.key ? "bg-emerald-50 border-emerald-300" : ""}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-sm font-semibold">From</div>
                  <div className="text-sm font-semibold">To</div>
                  <Select label="Warehouse" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
                  <div className="grid grid-cols-1 gap-3">
                    <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                    <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))} />
                    <Select label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} options={territoriesForZone.map((t) => ({ value: t, label: t }))} />

                    {form.primarySaleMode === "brand" ? (
                      <>
                        <Select label="Field" value={form.fieldId || ""} onChange={(v) => setField("fieldId", v)} options={fieldsForTerritory.map((f) => ({ value: f._id, label: f.name }))} />
                        <Select label="Business name" value={form.businessUserId} onChange={(v) => setField("businessUserId", v)} options={brandBusinessUsers.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))} />
                        <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                      </>
                    ) : null}

                    {form.primarySaleMode === "distributor" ? (
                      <>
                        <Select label="Distributor" value={form.distributorUserId} onChange={(v) => setField("distributorUserId", v)} options={distributorsForTerritory.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))} />
                        <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                      </>
                    ) : null}

                    {form.primarySaleMode === "subDistributor" ? (
                      <>
                        <Input label="Sub-distributor name" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
                        <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                      </>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <Select
                    label="Request Source"
                    value={form.sourceType}
                    onChange={(v) => setField("sourceType", v)}
                    options={modeConfig[activeMode].sourceOptions}
                  />
                  <Input label="From" value={form.customerName} onChange={(v) => setField("customerName", v)} placeholder="Enter source name" />
                  <Select label="To Warehouse" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
                  <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                  <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                  <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zones.filter((z) => !form.regionId || z.regionId === selectedRegion?.regionId).map((z) => ({ value: z._id, label: z.name }))} />
                  <Input label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} />
                </>
              )}

              <div className="md:col-span-2">
                <div className="font-semibold mb-2">Product Detail</div>
                <div className="overflow-x-auto rounded border">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b bg-zinc-50">
                        <th className="p-2">S.No</th><th className="p-2">Product Name</th><th className="p-2">Size</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Gross</th><th className="p-2">TO</th><th className="p-2">Disc</th><th className="p-2">Extra</th><th className="p-2">Bons</th><th className="p-2">V4GST</th><th className="p-2">GST</th><th className="p-2">Net Amt</th><th className="p-2">-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineRows.map(({ idx, line, product, calc }) => (
                        <tr key={idx} className="border-b">
                          <td className="p-1 text-center">{idx + 1}</td>
                          <td className="p-1 min-w-[180px]"><SelectBare value={line.productId} onChange={(v) => setItem(idx, "productId", v)} options={products.map((p) => ({ value: p._id, label: p.name }))} /></td>
                          <td className="p-1 min-w-[120px]"><InputBare type="text" value={calc.sizeText} readOnly /></td>
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
                          <td className="p-1"><button type="button" className="rounded border px-2 py-1" onClick={() => removeItem(idx)}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={addItem}>+ Add Product</button>
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
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60" disabled={saving}>
                  {saving ? "Submitting..." : activeMode === "primary" ? "Create Sale Order" : "Submit Request"}
                </button>
              </div>
            </form>

            <div className="pt-2">
              <div className="text-lg font-semibold text-zinc-900">{activeMode === "primary" ? "Sale Stock Ledger" : `${modeConfig[activeMode].title} Ledger`}</div>
              {activeMode === "primary" ? (
                <SaleStockLedgerTable rows={filteredOrders} onInvoice={printOrderInvoice} onDelete={deleteOrder} />
              ) : (
                <div className="overflow-x-auto mt-3 rounded border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Order Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Action</th><th className="p-2 text-left">Date</th></tr></thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className={`border-t ${order.status === "rejected" ? "bg-red-50" : order.status === "delivered" ? "bg-emerald-50" : ""}`}>
                          <td className="p-2">{order.orderNo || order.transactionCode}</td>
                          <td className="p-2">{order.customerName || order.fromEntityName || "-"}</td>
                          <td className="p-2">{order.toWarehouseName || order.warehouseName || "-"}</td>
                          <td className="p-2 capitalize">{order.status}</td>
                          <td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" type="button" onClick={() => printOrderInvoice(order)}>Invoice/Receipt</button><button className="rounded border border-red-300 text-red-700 px-2 py-1" type="button" onClick={() => deleteOrder(order._id)}>Delete</button></div></td>
                          <td className="p-2">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                        </tr>
                      ))}
                      {!filteredOrders.length ? <tr><td colSpan={6} className="p-5 text-center text-zinc-500">No records in this ledger.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {activeMode === "primary" ? (
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-zinc-900">Order requests list</div>
              <RequestSaleStocksTable
                rows={saleOrderRequests}
                onOpen={markRequestRead}
                onApprove={(id) => updateSaleRequestStatus(id, "APPROVED")}
                onReject={(id) => updateSaleRequestStatus(id, "REJECTED")}
                onDispatch={(id) => updateSaleRequestStatus(id, "DISPATCH")}
                onDelivered={(id) => updateSaleRequestStatus(id, "DELIVERED")}
                onPreview={(row) => setPreviewRequest(row)}
              />
            </section>
          ) : null}

          </>
        ) : null}

        <RequestPreviewModal row={previewRequest} onClose={() => setPreviewRequest(null)} />
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }) {
  return <label className="text-sm"><div className="text-zinc-600">{label}</div><input className="mt-1 w-full rounded-lg border px-3 py-2" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="text-sm"><div className="text-zinc-600">{label}</div><select className="mt-1 w-full rounded-lg border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function SelectBare({ value, onChange, options }) {
  return <select className="w-full min-w-[220px] rounded border px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}

function InputBare({ type = "text", value, onChange = () => {}, readOnly = false }) {
  return <input className="w-full min-w-[88px] rounded border px-2 py-1" type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />;
}



function SaleStockLedgerTable({ rows, onInvoice, onDelete }) {
  return (
    <div className="overflow-x-auto mt-3 rounded border">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Distributor Name</th><th className="p-2 text-left">Business Name</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Action</th></tr></thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order._id} className="border-t">
              <td className="p-2">{order.orderNo || order.transactionCode || "-"}</td>
              <td className="p-2">{order.fromEntityName || order.customerName || "-"}</td>
              <td className="p-2">{order.distributorName || (String(order.toEntityType || "").toUpperCase() === "DISTRIBUTOR" ? (order.toEntityName || "-") : "-")}</td>
              <td className="p-2">{order.brandName || (String(order.toEntityType || "").toUpperCase() === "BRAND" ? (order.toEntityName || "-") : "-")}</td>
              <td className="p-2">{(order.createdAt || order.transactionAt) ? new Date(order.createdAt || order.transactionAt).toLocaleString() : "-"}</td>
              <td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" type="button" onClick={() => onInvoice(order)}>Invoice/Receipt</button><button className="rounded border border-red-300 text-red-700 px-2 py-1" type="button" onClick={() => onDelete(order._id)}>Delete</button></div></td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={6} className="p-5 text-center text-zinc-500">No records in this ledger.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}


function RequestSaleStocksTable({ rows, onOpen, onApprove, onReject, onDispatch, onDelivered, onPreview }) {
  return (
    <div className="overflow-x-auto mt-3 rounded border">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b bg-zinc-50"><th className="p-2 text-left">Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Read/Unread</th><th className="p-2 text-left">Action</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const status = String(r.requestStatus || "PENDING").toUpperCase();
            const unread = !r.requestReadAt;
            return (
              <tr key={r._id} className="border-b">
                <td className="p-2">{r.transactionCode}</td>
                <td className="p-2">{r.fromEntityName || "-"}</td>
                <td className="p-2">{r.requestSourceRole || "-"}</td>
                <td className="p-2">{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : "-"}</td>
                <td className="p-2">{status}</td>
                <td className="p-2">{unread ? <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Unread</span> : "Read"}</td>
                <td className="p-2"><div className="flex flex-wrap gap-2"><button className="rounded border px-2 py-1" onClick={() => onOpen(r._id)}>Open</button><button className="rounded border border-emerald-300 px-2 py-1 text-emerald-700" onClick={() => onPreview(r)}>Preview</button><button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => onReject(r._id)}>Reject</button><button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={() => onApprove(r._id)}>Approve</button><button className="rounded border border-indigo-300 px-2 py-1 text-indigo-700" onClick={() => onDispatch(r._id)}>Dispatch</button><button className="rounded border border-emerald-500 px-2 py-1 text-emerald-800" onClick={() => onDelivered(r._id)}>Delivered</button></div></td>
              </tr>
            );
          })}
          {!rows.length ? <tr><td colSpan={7} className="p-5 text-center text-zinc-500">No order requests.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function RequestPreviewModal({ row, onClose }) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3"><div className="text-lg font-semibold">Order Request Preview</div><button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button></div>
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-4 text-sm">
          <div className="grid md:grid-cols-3 gap-3"><PreviewField label="Code" value={row.transactionCode || "-"} /><PreviewField label="From" value={row.fromEntityName || "-"} /><PreviewField label="Source" value={row.requestSourceRole || "-"} /><PreviewField label="Region" value={row.regionName || "-"} /><PreviewField label="Zone" value={row.zoneName || "-"} /><PreviewField label="Territory" value={row.territory || "-"} /><PreviewField label="To" value={row.toEntityName || row.warehouseName || "-"} /><PreviewField label="Address" value={row.note || "-"} /><PreviewField label="Status" value={String(row.requestStatus || "PENDING").toUpperCase()} /></div>
          <div className="overflow-x-auto rounded border"><table className="min-w-full text-xs"><thead><tr className="border-b bg-zinc-50"><th className="p-2">Product</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Amount</th><th className="p-2">Note</th></tr></thead><tbody>{(row.items || []).map((it, i) => <tr key={i} className="border-b"><td className="p-2">{it.productName || "-"}</td><td className="p-2">{it.quantity || 0}</td><td className="p-2">{it.unitPrice || 0}</td><td className="p-2">{it.amount || 0}</td><td className="p-2">{it.note || "-"}</td></tr>)}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }) {
  return <div><div className="text-zinc-500">{label}</div><div className="font-medium">{value}</div></div>;
}

function InlineToast({ type, message }) {
  const styleMap = {
    success: "border-l-4 border-l-emerald-500 text-zinc-800",
    error: "border-l-4 border-l-red-500 text-zinc-800",
    info: "border-l-4 border-l-blue-500 text-zinc-800",
    warning: "border-l-4 border-l-amber-500 text-zinc-800",
  };
  return (
    <div className={`fixed right-4 top-4 z-50 min-w-[280px] rounded-lg border bg-white px-4 py-3 text-sm shadow-lg ${styleMap[type] || styleMap.info}`}>
      <div className="font-semibold capitalize">{type || "info"}</div>
      <div className="mt-1">{message}</div>
    </div>
  );
}