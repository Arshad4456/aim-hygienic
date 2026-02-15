"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  { key: "PURCHASING_STOCK", title: "e.1 Purchasing Stock", detail: "Record supplier/industry purchases with pricing, totals, source, destination warehouse, date and time." },
  { key: "SALE_STOCK", title: "e.2 Sale Stock", detail: "Record sales to Brand, Distributor, or Sub-Distributor with territory and field mapping." },
  { key: "DAMAGE_STOCK", title: "e.3 Damage Stock", detail: "Capture damaged/expired stock and monitor expiry warnings before 2–3 months." },
  { key: "RETURN_STOCK", title: "e.4 Return Stock", detail: "Capture returns from brands/distributors and track payable return settlement due within 45 days." },
  { key: "RETURN_TO_SD", title: "e.5 Return to SD (Sub-Distributor)", detail: "Resell returned stock to a sub-distributor in same/other territory with full movement trail." },
];

const saleModes = [
  { key: "brand", label: "Sale to Brand" },
  { key: "distributor", label: "Sale to Distributor" },
  { key: "subDistributor", label: "Sale to Sub-Distributor" },
];

const blankItem = { productId: "", cartonSize: "", onePackPrice: "", oneCartonPrice: "", totalPrice: "", expiryDate: "" };

function parseCartonSize(value) {
  const match = String(value || "").trim().toLowerCase().replace(/\s+/g, "").match(/^(\d+)x(\d+)$/);
  if (!match) return { cartonCount: 0, totalPacks: 0, packsPerCarton: 0 };
  const cartonCount = Number(match[1] || 0);
  const totalPacks = Number(match[2] || 0);
  return { cartonCount, totalPacks, packsPerCarton: cartonCount > 0 ? totalPacks / cartonCount : 0 };
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (key && !map.has(key)) map.set(key, item);
  });
  return [...map.values()];
}

export default function WarehouseInventoryModulePage() {
  const [selectedCard, setSelectedCard] = useState(cards[0].key);
  const [saleMode, setSaleMode] = useState("brand");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [fields, setFields] = useState([]);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ daily: [], weekly: [], monthly: [], expiryAlerts: [], returnPayments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    fieldId: "",
    address: "",
    adjustment: "0",
    items: [{ ...blankItem }],
  });

  async function loadAll() {
    try {
      const [productsRes, warehousesRes, fieldsRes, usersRes, regionsRes, zonesRes, txRes, analyticsRes] = await Promise.all([
        apiFetch("/products"),
        apiFetch("/warehouses"),
        apiFetch("/fields"),
        apiFetch("/users"),
        apiFetch("/regions"),
        apiFetch("/zones"),
        apiFetch("/inventory/transactions"),
        apiFetch("/inventory/analytics"),
      ]);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setFields(fieldsRes.fields || []);
      setUsers(usersRes.users || []);
      setRegions(regionsRes.regions || []);
      setZones(zonesRes.zones || []);
      setTransactions(txRes.transactions || []);
      setAnalytics(analyticsRes.analytics || { daily: [], weekly: [], monthly: [], expiryAlerts: [], returnPayments: [] });
    } catch (e) {
      setErr(e.message || "Failed to load module");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const businessTypes = useMemo(() => [...new Set(users.map((u) => String(u.businessType || "").trim()).filter(Boolean))], [users]);
  const brandManagers = useMemo(() => users.filter((u) => u.role === "Brand Manager"), [users]);
  const distributors = useMemo(() => users.filter((u) => u.role === "Distributor"), [users]);

  const businessUsers = useMemo(
    () => brandManagers.filter((u) => (!form.businessType || u.businessType === form.businessType)),
    [brandManagers, form.businessType]
  );
  const selectedBusinessUser = useMemo(() => businessUsers.find((u) => u._id === form.businessUserId) || null, [businessUsers, form.businessUserId]);

  const selectedRegion = useMemo(() => regions.find((r) => r._id === form.regionId) || null, [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((z) => z._id === form.zoneId) || null, [zones, form.zoneId]);

  const zonesForRegion = useMemo(
    () => zones.filter((z) => !form.regionId || z.regionId === selectedRegion?.regionId),
    [zones, form.regionId, selectedRegion]
  );

  const territoriesForZone = useMemo(() => {
    const territoryUsers = users.filter((u) => {
      if (!u.territoryName) return false;
      if (!selectedZone) return false;
      return u.zoneId === selectedZone.zoneId || u.zoneName === selectedZone.name;
    });
    return uniqueBy(territoryUsers, (u) => u.territoryName).map((u) => u.territoryName);
  }, [users, selectedZone]);

  const distributorsForTerritory = useMemo(
    () => distributors.filter((u) => !form.territoryName || u.territoryName === form.territoryName),
    [distributors, form.territoryName]
  );

  const territoryFields = useMemo(
    () => fields.filter((f) => (f.territoryName || "") === (form.territoryName || "")),
    [fields, form.territoryName]
  );

  function setField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function setItem(i, key, value) {
    setForm((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) }));
  }

  function addItem() {
    setForm((p) => ({ ...p, items: [...p.items, { ...blankItem }] }));
  }

  function removeItem(i) {
    setForm((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }

  function resetSaleRouting() {
    setForm((p) => ({ ...p, businessType: "", businessUserId: "", businessName: "", regionId: "", zoneId: "", territoryName: "", distributorUserId: "", subDistributorName: "", fieldId: "", address: "" }));
  }

  function onChangeBusinessUser(userId) {
    const user = businessUsers.find((u) => u._id === userId) || null;
    setForm((p) => ({ ...p, businessUserId: userId, territoryName: user?.territoryName || "", fieldId: "" }));
  }

  const normalizedItems = useMemo(
    () =>
      form.items
        .map((item) => {
          const product = products.find((p) => p._id === item.productId);
          const parsed = parseCartonSize(item.cartonSize);
          const isDamageStock = selectedCard === "DAMAGE_STOCK";
          return {
            productId: product?.productId || "",
            productName: product?.name || "",
            cartonSize: item.cartonSize,
            cartons: parsed.cartonCount,
            totalPacks: parsed.totalPacks,
            packsPerCarton: parsed.packsPerCarton,
            onePackPrice: Number(item.onePackPrice || 0),
            oneCartonPrice: Number(item.oneCartonPrice || 0),
            totalPrice: Number(item.totalPrice || 0),
            unitPrice: parsed.totalPacks > 0 ? Number(item.totalPrice || 0) / parsed.totalPacks : 0,
            expiryDate: isDamageStock ? item.expiryDate || undefined : undefined,
          };
        })
        .filter((i) => i.productId),
    [form.items, products, selectedCard]
  );

  const totalPreview = useMemo(() => normalizedItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0) + Number(form.adjustment || 0), [normalizedItems, form.adjustment]);

  function validateSaleFields() {
    if (selectedCard !== "SALE_STOCK") return null;
    if (!form.warehouseId) return "From (Warehouse) is required.";
    if (!normalizedItems.length) return "At least one product detail is required.";

    if (saleMode === "brand") {
      if (!form.businessType || !form.businessUserId || !form.territoryName || !form.fieldId || !form.address) {
        return "Please fill all Sale to Brand fields (Business Type, Business Name, Territory, Field Name, Address).";
      }
    }
    if (saleMode === "distributor") {
      if (!form.regionId || !form.zoneId || !form.territoryName || !form.distributorUserId || !form.address) {
        return "Please fill all Sale to Distributor fields (Region, Zone, Territory, Distributor Name, Address).";
      }
    }
    if (saleMode === "subDistributor") {
      if (!form.regionId || !form.zoneId || !form.territoryName || !form.subDistributorName || !form.businessType || !form.businessName || !form.address) {
        return "Please fill all Sale to Sub-Distributor fields (Region, Zone, Territory, Sub-Distributor Name, Business Type, Business Name, Address).";
      }
    }
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const fromWarehouse = warehouses.find((w) => w._id === form.warehouseId);
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const selectedField = territoryFields.find((f) => f._id === form.fieldId);
      const selectedDistributor = distributors.find((u) => u._id === form.distributorUserId) || null;

      const saleValidationError = validateSaleFields();
      if (saleValidationError) {
        throw new Error(saleValidationError);
      }

      const body = {
        transactionType: selectedCard,
        warehouseId: fromWarehouse?.warehouseId || "",
        warehouseName: fromWarehouse?.name || "",
        adjustment: Number(form.adjustment || 0),
        items: normalizedItems,
      };

      if (selectedCard === "PURCHASING_STOCK") {
        body.fromEntityName = form.fromEntityName;
        body.toEntityName = toWarehouse?.name || "";
      } else if (selectedCard === "SALE_STOCK") {
        body.fromEntityName = fromWarehouse?.name || "";
        if (saleMode === "brand") {
          body.toEntityName = selectedBusinessUser?.businessName || selectedBusinessUser?.fullName || "";
          body.brandName = body.toEntityName;
          body.territory = form.territoryName;
          body.note = `Address: ${form.address}`;
        }
        if (saleMode === "distributor") {
          body.regionId = selectedRegion?.regionId || "";
          body.regionName = selectedRegion?.name || "";
          body.zoneId = selectedZone?.zoneId || "";
          body.zoneName = selectedZone?.name || "";
          body.territory = form.territoryName;
          body.note = `Address: ${form.address}`;
          body.distributorId = selectedDistributor?.userId || "";
          body.distributorName = selectedDistributor?.businessName || selectedDistributor?.fullName || "";
          body.toEntityName = body.distributorName;
        }
        if (saleMode === "subDistributor") {
          body.regionId = selectedRegion?.regionId || "";
          body.regionName = selectedRegion?.name || "";
          body.zoneId = selectedZone?.zoneId || "";
          body.zoneName = selectedZone?.name || "";
          body.territory = form.territoryName;
          body.note = `Address: ${form.address}`;
          body.distributorName = form.subDistributorName;
          body.subDistributorName = form.subDistributorName;
          body.toEntityName = form.subDistributorName;
          body.note = `Business Type: ${form.businessType || "-"}, Business Name: ${form.businessName || "-"}, Address: ${form.address || "-"}`;
        }
        body.fieldId = selectedField?.fieldId || "";
        body.fieldName = selectedField?.name || "";
      }

      await apiFetch("/inventory/transactions", { method: "POST", body });
      setOk("✅ Saved. Stock and analytics updated.");
      setForm((p) => ({ ...p, adjustment: "0", items: [{ ...blankItem }], fromEntityName: "", toWarehouseId: "", businessType: "", businessUserId: "", businessName: "", regionId: "", zoneId: "", territoryName: "", distributorUserId: "", subDistributorName: "", fieldId: "", address: "" }));
      await loadAll();
    } catch (e2) {
      setErr(e2.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function printInvoice(txn) {
    const html = `<html><body style="font-family:Arial;padding:20px;"><h1>AIM-HYGIENICS (PVT) LIMITED</h1><h3>${txn.transactionCode}</h3><div>${txn.transactionType} | ${new Date(txn.transactionAt).toLocaleString()}</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:10px;width:100%"><tr><th>Product</th><th>Carton Size</th><th>1 Pack Price</th><th>1 Carton Price</th><th>Total Price</th>${selectedCard === "DAMAGE_STOCK" ? "<th>Expiry Date</th>" : ""}</tr>${(txn.items || []).map((i) => `<tr><td>${i.productName}</td><td>${i.cartonSize || "-"}</td><td>${i.onePackPrice || 0}</td><td>${i.oneCartonPrice || 0}</td><td>${i.totalPrice || 0}</td>${selectedCard === "DAMAGE_STOCK" ? `<td>${i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : "-"}</td>` : ""}</tr>`).join("")}</table><h3>Grand Total: ${txn.grandTotal || 0}</h3></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this record?")) return;
    try {
      await apiFetch(`/inventory/transactions/${id}`, { method: "DELETE" });
      setTransactions((prev) => prev.filter((row) => row._id !== id));
      setOk("✅ Record deleted.");
    } catch (e) {
      setErr(e.message || "Failed to delete record");
    }
  }

  const currentCard = cards.find((c) => c.key === selectedCard);
  const cardTx = transactions.filter((t) => t.transactionType === selectedCard);

  return (
    <AdminShell title="Warehouse & Inventory" user={null}>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Warehouse & Inventory Module</h2>
          <p className="text-sm text-zinc-600 mt-1">Select e.1 to e.5 card. Each card shows its dedicated detail workflow.</p>
          {err ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
          {ok ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div> : null}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {cards.map((c) => (
              <button key={c.key} type="button" onClick={() => setSelectedCard(c.key)} className={`text-left rounded-xl border p-3 ${selectedCard === c.key ? "border-emerald-300 bg-emerald-50" : "hover:bg-zinc-50"}`}>
                <div className="font-semibold text-sm">{c.title}</div>
                <div className="text-xs text-zinc-600 mt-1">Click to open details</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{currentCard?.title}</h3>
          <p className="text-sm text-zinc-600 mt-1">{currentCard?.detail}</p>

          <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submit}>
            {selectedCard === "PURCHASING_STOCK" ? (
              <>
                <Input label="From" value={form.fromEntityName} onChange={(v) => setField("fromEntityName", v)} />
                <Select label="To (Warehouse)" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))} />
                <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
              </>
            ) : null}

            {selectedCard === "SALE_STOCK" ? (
              <>
                <div className="md:col-span-2">
                  <div className="text-sm text-zinc-700">Sale Options</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {saleModes.map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => {
                          setSaleMode(mode.key);
                          resetSaleRouting();
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs ${saleMode === mode.key ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "hover:bg-zinc-50"}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {saleMode === "brand" ? (
                  <>
                    <Select label="From (Warehouse)" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))} />
                    <div className="md:col-span-2 text-sm font-semibold mt-1">To</div>
                    <Select label="Business Type" value={form.businessType} onChange={(v) => setField("businessType", v)} options={businessTypes.map((x) => ({ value: x, label: x }))} />
                    <Select label="Business Name" value={form.businessUserId} onChange={onChangeBusinessUser} options={businessUsers.map((u) => ({ value: u._id, label: u.businessName || u.fullName || u.username }))} />
                    <Input label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} readOnly />
                    <Select label="Field Name" value={form.fieldId} onChange={(v) => setField("fieldId", v)} options={territoryFields.map((f) => ({ value: f._id, label: `${f.name} (${f.fieldId})` }))} />
                    <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                    <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
                  </>
                ) : null}

                {saleMode === "distributor" ? (
                  <>
                    <Select label="From (Warehouse)" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))} />
                    <div className="md:col-span-2 text-sm font-semibold mt-1">To</div>
                    <Select label="Region" value={form.regionId} onChange={(v) => setForm((p) => ({ ...p, regionId: v, zoneId: "", territoryName: "", distributorUserId: "", fieldId: "" }))} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                    <Select label="Zone" value={form.zoneId} onChange={(v) => setForm((p) => ({ ...p, zoneId: v, territoryName: "", distributorUserId: "", fieldId: "" }))} options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))} />
                    <Select label="Territory" value={form.territoryName} onChange={(v) => setForm((p) => ({ ...p, territoryName: v, distributorUserId: "", fieldId: "" }))} options={territoriesForZone.map((t) => ({ value: t, label: t }))} />
                    <Select label="Distributor Name" value={form.distributorUserId} onChange={(v) => setField("distributorUserId", v)} options={distributorsForTerritory.map((u) => ({ value: u._id, label: u.businessName || u.fullName || u.username }))} />
                    <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                    <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
                  </>
                ) : null}

                {saleMode === "subDistributor" ? (
                  <>
                    <Select label="From (Warehouse)" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))} />
                    <div className="md:col-span-2 text-sm font-semibold mt-1">To</div>
                    <Select label="Region" value={form.regionId} onChange={(v) => setForm((p) => ({ ...p, regionId: v, zoneId: "", territoryName: "", fieldId: "" }))} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                    <Select label="Zone" value={form.zoneId} onChange={(v) => setForm((p) => ({ ...p, zoneId: v, territoryName: "", fieldId: "" }))} options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))} />
                    <Select label="Territory" value={form.territoryName} onChange={(v) => setForm((p) => ({ ...p, territoryName: v, fieldId: "" }))} options={territoriesForZone.map((t) => ({ value: t, label: t }))} />
                    <Input label="Sub-Distributor Name" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
                    <Input label="Business Type" value={form.businessType} onChange={(v) => setField("businessType", v)} />
                    <Input label="Business Name" value={form.businessName} onChange={(v) => setField("businessName", v)} />
                    <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                    <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
                  </>
                ) : null}

              </>
            ) : null}

            {!["PURCHASING_STOCK", "SALE_STOCK"].includes(selectedCard) ? (
              <>
                <Select label="Warehouse" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))} />
                <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
              </>
            ) : null}

            <div className="md:col-span-2 space-y-2 mt-2">
              <div className="text-sm font-semibold">Product Details</div>
              {form.items.map((item, i) => (
                <div key={i} className="grid md:grid-cols-7 gap-2 rounded-xl border p-3 bg-zinc-50">
                  <Select label="Product" value={item.productId} onChange={(v) => setItem(i, "productId", v)} options={products.map((p) => ({ value: p._id, label: p.name }))} />
                  <Input label="Carton Size (e.g. 1x8, 2x16)" value={item.cartonSize} onChange={(v) => setItem(i, "cartonSize", v)} />
                  <Input label="1 Pack Price" type="number" value={item.onePackPrice} onChange={(v) => setItem(i, "onePackPrice", v)} />
                  <Input label="1 Carton Price" type="number" value={item.oneCartonPrice} onChange={(v) => setItem(i, "oneCartonPrice", v)} />
                  <Input label="Total Price" type="number" value={item.totalPrice} onChange={(v) => setItem(i, "totalPrice", v)} />
                  {selectedCard === "DAMAGE_STOCK" ? <Input label="Expiry Date" type="date" value={item.expiryDate} onChange={(v) => setItem(i, "expiryDate", v)} /> : <div />}
                  <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1} className="mt-6 rounded-lg border px-2 py-2 text-sm">Remove</button>
                </div>
              ))}
              <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={addItem}>+ Add product line</button>
            </div>

            <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">Grand Total Preview: <span className="font-semibold">{totalPreview.toFixed(2)}</span></div>
            <div className="md:col-span-2"><button disabled={saving || loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">{saving ? "Saving..." : "Save"}</button></div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Daily / Weekly / Monthly Analysis</h3>
          <div className="grid md:grid-cols-3 gap-3 mt-3"><Stat title="Daily" rows={analytics.daily} /><Stat title="Weekly" rows={analytics.weekly} /><Stat title="Monthly" rows={analytics.monthly} /></div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{currentCard?.title} Ledger</h3>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">Date & Time</th><th className="p-2 text-left">Grand Total</th><th className="p-2 text-left">Actions</th></tr></thead>
              <tbody>
                {cardTx.map((t) => (
                  <tr key={t._id} className="border-b"><td className="p-2">{t.transactionCode}</td><td className="p-2">{new Date(t.transactionAt).toLocaleString()}</td><td className="p-2">{Number(t.grandTotal || 0).toFixed(2)}</td><td className="p-2"><div className="flex gap-2"><button onClick={() => printInvoice(t)} className="rounded border px-2 py-1">Invoice/Receipt</button><button onClick={() => deleteRecord(t._id)} className="rounded border border-red-300 text-red-700 px-2 py-1">Delete</button></div></td></tr>
                ))}
              </tbody>
            </table>
            {!cardTx.length ? <div className="text-sm text-zinc-500 mt-2">No records for this card.</div> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <label className="text-sm">
      <span className="text-zinc-600">{label}</span>
      <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm">
      <span className="text-zinc-600">{label}</span>
      <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Stat({ title, rows }) {
  return (
    <div className="rounded-xl border p-3 text-xs">
      <div className="font-semibold text-sm">{title}</div>
      {rows?.length ? rows.map((r) => <div key={r._id}>{r._id}: {r.transactions} tx / {Number(r.amount || 0).toFixed(0)}</div>) : <div className="text-zinc-500">No data</div>}
    </div>
  );
}