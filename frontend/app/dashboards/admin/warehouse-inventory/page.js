"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  { key: "PURCHASING_STOCK", title: "e.1 Purchasing Stock" },
  { key: "SALE_STOCK", title: "e.2 Sale Stock" },
  { key: "DAMAGE_STOCK", title: "e.3 Damage Stock" },
  { key: "RETURN_STOCK", title: "e.4 Return Stock" },
  { key: "RETURN_TO_SD", title: "e.5 Return to SD" },
  { key: "W2W_TRANSFER", title: "e.6 Warehouse to Warehouse Transfer" },
  { key: "STOCK_SUMMARY", title: "e.7 Stock Summary" },
  { key: "LOW_STOCK", title: "e.8 Low Stock Alert" },
];

const saleModes = [
  { key: "brand", label: "Sale to Brand" },
  { key: "distributor", label: "Sale to Distributor" },
  { key: "subDistributor", label: "Sale to Sub-Distributor" },
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

export default function WarehouseInventoryModulePage() {
  const [selectedCard, setSelectedCard] = useState(cards[0].key);
  const [saleMode, setSaleMode] = useState("brand");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [summary, setSummary] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [nearExpiry, setNearExpiry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submitLockRef = useRef(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
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
    adjustment: "0",
    extraDiscPer: "0",
    advTaxPer: "0",
    whTaxPer: "0",
    expense: "0",
    items: [{ ...emptyLine }],
  });

  async function loadAll() {
    const result = await Promise.allSettled([
      apiFetch("/products"),
      apiFetch("/warehouses"),
      apiFetch("/users"),
      apiFetch("/regions"),
      apiFetch("/zones"),
      apiFetch("/inventory/transactions"),
      apiFetch("/inventory/transfers"),
      apiFetch("/inventory/summary"),
      apiFetch("/inventory/low-stock"),
      apiFetch("/inventory/near-expiry-products"),
    ]);

    const [productsRes, warehousesRes, usersRes, regionsRes, zonesRes, txRes, transfersRes, summaryRes, lowStockRes, nearRes] =
      result.map((entry) => (entry.status === "fulfilled" ? entry.value : null));

    if (productsRes) setProducts(productsRes.products || []);
    if (warehousesRes) setWarehouses(warehousesRes.warehouses || []);
    if (usersRes) setUsers(usersRes.users || []);
    if (regionsRes) setRegions(regionsRes.regions || []);
    if (zonesRes) setZones(zonesRes.zones || []);
    if (txRes) setTransactions(txRes.transactions || []);
    if (transfersRes) setTransfers(transfersRes.transfers || []);
    if (summaryRes) setSummary(summaryRes.summary || []);
    if (lowStockRes) setLowStock(lowStockRes.lowStock || []);
    if (nearRes) setNearExpiry(nearRes.products || []);

    if (result.every((entry) => entry.status === "rejected")) {
      setErr("Failed to load module data");
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
  const distributorsForTerritory = useMemo(
    () => distributors.filter((d) => !form.territoryName || d.territoryName === form.territoryName),
    [distributors, form.territoryName],
  );
  const brandBusinessUsers = useMemo(
    () => brandManagers.filter((u) => !form.businessType || u.businessType === form.businessType),
    [brandManagers, form.businessType],
  );

  const cardTx = useMemo(() => {
    if (["W2W_TRANSFER", "STOCK_SUMMARY", "LOW_STOCK"].includes(selectedCard)) return [];
    return transactions.filter((t) => t.transactionType === selectedCard);
  }, [transactions, selectedCard]);

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
    () => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt - toNum(form.expense),
    [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense],
  );

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
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
          notes: `gross:${r.calc.gross},to:${r.calc.toValue},disc:${r.calc.discValue},extra:${r.calc.extraValue},bons:${r.calc.bonsValue},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
        })),
    [lineRows, selectedCard],
  );

  async function submit(e) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const fromWarehouse = warehouses.find((w) => w._id === form.warehouseId);
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const selectedBrand = brandBusinessUsers.find((u) => u._id === form.businessUserId);
      const selectedDist = distributorsForTerritory.find((u) => u._id === form.distributorUserId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);

      const body = {
        transactionType: selectedCard,
        warehouseId: fromWarehouse?.warehouseId || "",
        warehouseName: fromWarehouse?.name || "",
        adjustment: Number(form.adjustment || 0),
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
          body.toEntityName = selectedBrand?.businessName || selectedBrand?.fullName || "";
          body.note = `Address:${form.address}`;
        }
        if (saleMode === "distributor") {
          body.regionId = region?.regionId || "";
          body.regionName = region?.name || "";
          body.zoneId = zone?.zoneId || "";
          body.zoneName = zone?.name || "";
          body.territory = form.territoryName;
          body.distributorName = selectedDist?.businessName || selectedDist?.fullName || "";
          body.toEntityName = body.distributorName;
          body.note = `Address:${form.address}`;
        }
        if (saleMode === "subDistributor") {
          body.regionId = region?.regionId || "";
          body.regionName = region?.name || "";
          body.zoneId = zone?.zoneId || "";
          body.zoneName = zone?.name || "";
          body.territory = form.territoryName;
          body.subDistributorName = form.subDistributorName;
          body.toEntityName = form.subDistributorName;
          body.note = `Business Type:${form.businessType}, Business Name:${form.businessName}, Address:${form.address}`;
        }
      }

      const created = await apiFetch("/inventory/transactions", { method: "POST", body });
      setOk("✅ Saved.");
      if (created?.transaction) {
        setTransactions((prev) => [created.transaction, ...prev]);
      }
      setForm((s) => ({ ...s, adjustment: "0", items: [{ ...emptyLine }], extraDiscPer: "0", advTaxPer: "0", whTaxPer: "0", expense: "0" }));
      loadAll();
    } catch (e2) {
      setErr(e2.message || "Failed to save");
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
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
    const finalGrandTotal = toNum(txn.grandTotal || lineTotal);

    const html = `
      <html>
      <body style="font-family: Arial; padding: 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">${logo}<div style="text-align:right;"><div style="font-size:13px;font-weight:700;">Sales Tax Invoice</div></div></div>
        <div style="margin-top:8px; display:flex; justify-content:space-between; font-size:12px;">
          <div>Date: ${new Date(txn.transactionAt).toLocaleDateString()}</div>
          <div>Invoice #: ${txn.transactionCode}</div>
        </div>
        <div style="margin-top:8px;font-size:12px;">Bill To: ${txn.toEntityName || txn.distributorName || "-"}</div>
        <div style="font-size:12px;">Address: ${txn.note || "-"}</div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; margin-top:10px; font-size:12px;">
          <thead><tr><th>#</th><th>Product Name</th><th>Qty</th><th>Rate</th><th>Gross</th><th>TO</th><th>Disc</th><th>Extra</th><th>Bons</th><th>V4GST</th><th>GST</th><th>Net Amt</th></tr></thead>
          <tbody>
          ${rows.join("")}
          </tbody>
        </table>
        <div style="margin-top:12px; font-size:12px; display:flex; justify-content:space-between;">
          <div>
            <div>Extra Disc: ${txn.extraDiscPer || 0}%</div>
            <div>Adv Tax: ${txn.advTaxPer || 0}%</div>
            <div>W.H Tax: ${txn.whTaxPer || 0}%</div>
            <div>Expense: ${txn.expense || 0}</div>
          </div>
          <div><strong>Total: ${finalGrandTotal.toFixed(2)}</strong></div>
        </div>
        <div style="margin-top:16px;text-align:center;font-size:13px;font-weight:600;">Thank you for bussiness with us</div>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this record?")) return;
    await apiFetch(`/inventory/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((r) => r._id !== id));
  }

  async function updateMinStock(productDbId, value) {
    const product = products.find((p) => p._id === productDbId);
    if (!product) return;
    await apiFetch(`/products/${productDbId}`, {
      method: "PUT",
      body: { ...product, minStockLevel: Number(value || 0) },
    });
    await loadAll();
  }

  return (
    <AdminShell title="Warehouse & Inventory" user={null}>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Warehouse & Inventory Module</h2>
          {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}
          {ok ? <div className="mt-2 text-sm text-emerald-600">{ok}</div> : null}
          <div className="grid md:grid-cols-4 gap-2 mt-3">
            {cards.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedCard(c.key)}
                className={`rounded-lg border p-2 text-left text-sm ${selectedCard === c.key ? "bg-emerald-50 border-emerald-300" : "hover:bg-zinc-50"}`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </section>

        {["PURCHASING_STOCK", "SALE_STOCK", "DAMAGE_STOCK", "RETURN_STOCK", "RETURN_TO_SD"].includes(selectedCard) ? (
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
                  <Select
                    label="From (Warehouse)"
                    value={form.warehouseId}
                    onChange={(v) => setField("warehouseId", v)}
                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                  />
                  {saleMode === "brand" ? (
                    <>
                      <Select
                        label="Business Type"
                        value={form.businessType}
                        onChange={(v) => setField("businessType", v)}
                        options={businessTypes.map((x) => ({ value: x, label: x }))}
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
                  {saleMode !== "brand" ? (
                    <>
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
                      {saleMode === "distributor" ? (
                        <Select
                          label="Distributor Name"
                          value={form.distributorUserId}
                          onChange={(v) => setField("distributorUserId", v)}
                          options={distributorsForTerritory.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))}
                        />
                      ) : null}
                      {saleMode === "subDistributor" ? (
                        <>
                          <Input label="Sub-Distributor Name" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
                          <Input label="Business Type" value={form.businessType} onChange={(v) => setField("businessType", v)} />
                          <Input label="Business Name" value={form.businessName} onChange={(v) => setField("businessName", v)} />
                        </>
                      ) : null}
                      <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                    </>
                  ) : null}
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

              {["RETURN_STOCK", "RETURN_TO_SD"].includes(selectedCard) ? (
                <Select
                  label="Warehouse"
                  value={form.warehouseId}
                  onChange={(v) => setField("warehouseId", v)}
                  options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                />
              ) : null}

              <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />

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
                        {["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard) ? <th className="p-2">EXP Date</th> : null}
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
                          {["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard) ? (
                            <td className="p-1"><InputBare type="date" value={line.expiryDate} onChange={(v) => setItem(idx, "expiryDate", v)} /></td>
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

        {selectedCard === "W2W_TRANSFER" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Warehouse to Warehouse Transfer</h3><TransferTable rows={transfers} /></section> : null}
        {selectedCard === "STOCK_SUMMARY" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Stock Summary</h3><SummaryTable rows={summary} products={products} onUpdateMin={updateMinStock} /></section> : null}
        {selectedCard === "LOW_STOCK" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Low Stock Alert</h3><LowStockTable rows={lowStock} /></section> : null}

        {["PURCHASING_STOCK", "SALE_STOCK", "DAMAGE_STOCK", "RETURN_STOCK", "RETURN_TO_SD"].includes(selectedCard) ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{cards.find((c) => c.key === selectedCard)?.title} Ledger</h3>
            <LedgerTable type={selectedCard} rows={cardTx} onDelete={deleteRecord} onInvoice={printInvoice} />
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}

function LedgerTable({ type, rows, onDelete, onInvoice }) {
  const purchase = type === "PURCHASING_STOCK";
  const sale = type === "SALE_STOCK";
  return (
    <div className="overflow-x-auto mt-2">
      <table className="min-w-full text-sm">
        <thead>
          {purchase ? (
            <tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Grand Total</th><th className="p-2 text-left">Action</th></tr>
          ) : sale ? (
            <tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Distributor Name</th><th className="p-2 text-left">Bussiness Name</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Grand Total</th><th className="p-2 text-left">Action</th></tr>
          ) : (
            <tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Grand Total</th><th className="p-2 text-left">Action</th></tr>
          )}
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className="border-b">
              <td className="p-2">{r.transactionCode}</td>
              {purchase ? <><td className="p-2">{r.fromEntityName || "-"}</td><td className="p-2">{r.toEntityName || "-"}</td></> : null}
              {sale ? <><td className="p-2">{r.fromEntityName || "-"}</td><td className="p-2">{r.distributorName || "-"}</td><td className="p-2">{r.brandName || r.toEntityName || "-"}</td></> : null}
              <td className="p-2">{new Date(r.transactionAt).toLocaleString()}</td>
              <td className="p-2">{Number(r.grandTotal || 0).toFixed(2)}</td>
              <td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={() => onInvoice(r)}>Invoice/Receipt</button><button className="rounded border border-red-300 text-red-700 px-2 py-1" onClick={() => onDelete(r._id)}>Delete</button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferTable({ rows }) {
  return <div className="overflow-x-auto mt-2"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Qty</th><th className="p-2 text-left">Status</th></tr></thead><tbody>{rows.map((r)=><tr key={r._id} className="border-b"><td className="p-2">{r.productName}</td><td className="p-2">{r.fromWarehouseName}</td><td className="p-2">{r.toWarehouseName}</td><td className="p-2">{r.quantity}</td><td className="p-2">{r.status}</td></tr>)}</tbody></table></div>;
}

function SummaryTable({ rows, products, onUpdateMin }) {
  const [edits, setEdits] = useState({});
  return <div className="overflow-x-auto mt-2"><table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Product</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Minimum Stock Level</th><th className="p-2 text-left">Action</th></tr></thead><tbody>{rows.map((r)=>{const p=products.find((x)=>x.productId===r._id.productId);return <tr key={`${r._id.productId}-${r._id.warehouseId}`} className="border-b"><td className="p-2">{r.productName}</td><td className="p-2">{r.warehouseName}</td><td className="p-2">{r.quantity}</td><td className="p-2"><input className="border rounded px-2 py-1 w-24" value={edits[p?._id] ?? p?.minStockLevel ?? 0} onChange={(e)=>setEdits((s)=>({...s,[p?._id]:e.target.value}))} /></td><td className="p-2"><button className="rounded border px-2 py-1" onClick={()=>p&&onUpdateMin(p._id,edits[p._id] ?? p.minStockLevel)}>Update</button></td></tr>;})}</tbody></table></div>;
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
