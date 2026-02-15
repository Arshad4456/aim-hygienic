"use client";

import { useEffect, useMemo, useState } from "react";
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

const blankItem = {
  productId: "",
  cartonSize: "",
  onePackPrice: "",
  oneCartonPrice: "",
  totalPrice: "",
  manufactureDate: "",
  expiryDate: "",
  quantity: "",
};

function parseCartonSize(value) {
  const m = String(value || "").trim().toLowerCase().replace(/\s+/g, "").match(/^(\d+)x(\d+)$/);
  if (!m) return { cartonCount: 0, totalPacks: 0, packsPerCarton: 0 };
  const cartonCount = Number(m[1]);
  const totalPacks = Number(m[2]);
  return { cartonCount, totalPacks, packsPerCarton: cartonCount > 0 ? totalPacks / cartonCount : 0 };
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
    items: [{ ...blankItem }],
  });

  async function loadAll() {
    try {
      const [productsRes, warehousesRes, usersRes, regionsRes, zonesRes, txRes, transfersRes, summaryRes, lowStockRes, nearRes] = await Promise.all([
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
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setUsers(usersRes.users || []);
      setRegions(regionsRes.regions || []);
      setZones(zonesRes.zones || []);
      setTransactions(txRes.transactions || []);
      setTransfers(transfersRes.transfers || []);
      setSummary(summaryRes.summary || []);
      setLowStock(lowStockRes.lowStock || []);
      setNearExpiry(nearRes.products || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const brandManagers = useMemo(() => users.filter((u) => u.role === "Brand Manager"), [users]);
  const distributors = useMemo(() => users.filter((u) => u.role === "Distributor"), [users]);
  const businessTypes = useMemo(() => [...new Set(users.map((u) => u.businessType).filter(Boolean))], [users]);
  const zonesForRegion = useMemo(() => {
    const region = regions.find((r) => r._id === form.regionId);
    if (!region) return [];
    return zones.filter((z) => z.regionId === region.regionId);
  }, [regions, zones, form.regionId]);
  const territoriesForZone = useMemo(() => {
    const zone = zones.find((z) => z._id === form.zoneId);
    if (!zone) return [];
    return [...new Set(users.filter((u) => u.zoneId === zone.zoneId || u.zoneName === zone.name).map((u) => u.territoryName).filter(Boolean))];
  }, [zones, users, form.zoneId]);
  const distributorsForTerritory = useMemo(() => distributors.filter((d) => !form.territoryName || d.territoryName === form.territoryName), [distributors, form.territoryName]);
  const brandBusinessUsers = useMemo(() => brandManagers.filter((u) => !form.businessType || u.businessType === form.businessType), [brandManagers, form.businessType]);

  const cardTx = useMemo(() => {
    if (selectedCard === "W2W_TRANSFER" || selectedCard === "STOCK_SUMMARY" || selectedCard === "LOW_STOCK") return [];
    return transactions.filter((t) => t.transactionType === selectedCard);
  }, [transactions, selectedCard]);

  function setField(key, value) { setForm((s) => ({ ...s, [key]: value })); }
  function setItem(i, key, value) { setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) })); }
  function addItem() { setForm((s) => ({ ...s, items: [...s.items, { ...blankItem }] })); }
  function removeItem(i) { setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) })); }

  const normalizedItems = useMemo(() => form.items.map((item) => {
    const product = products.find((p) => p._id === item.productId);
    if (selectedCard === "DAMAGE_STOCK") {
      const qty = Number(item.quantity || 0);
      return {
        productId: product?.productId || "",
        productName: product?.name || "",
        cartonSize: `1x${qty}`,
        cartons: 1,
        totalPacks: qty,
        packsPerCarton: qty,
        onePackPrice: 0,
        oneCartonPrice: 0,
        totalPrice: 0,
        unitPrice: 0,
        manufactureDate: item.manufactureDate || undefined,
        expiryDate: item.expiryDate || undefined,
      };
    }
    const parsed = parseCartonSize(item.cartonSize);
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
      manufactureDate: selectedCard === "PURCHASING_STOCK" ? item.manufactureDate || undefined : undefined,
      expiryDate: ["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard) ? item.expiryDate || undefined : undefined,
    };
  }).filter((x) => x.productId), [form.items, products, selectedCard]);

  async function submit(e) {
    e.preventDefault();
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
      };

      if (selectedCard === "PURCHASING_STOCK") {
        body.fromEntityName = form.fromEntityName;
        body.toEntityName = toWarehouse?.name || "";
      }
      if (selectedCard === "SALE_STOCK") {
        body.fromEntityName = fromWarehouse?.name || "";
        if (saleMode === "brand") {
          body.toEntityName = selectedBrand?.businessName || selectedBrand?.fullName || "";
          body.distributorName = "";
          body.note = `Address: ${form.address}`;
        }
        if (saleMode === "distributor") {
          body.regionId = region?.regionId || "";
          body.regionName = region?.name || "";
          body.zoneId = zone?.zoneId || "";
          body.zoneName = zone?.name || "";
          body.territory = form.territoryName;
          body.distributorName = selectedDist?.businessName || selectedDist?.fullName || "";
          body.toEntityName = body.distributorName;
          body.note = `Address: ${form.address}`;
        }
        if (saleMode === "subDistributor") {
          body.regionId = region?.regionId || "";
          body.regionName = region?.name || "";
          body.zoneId = zone?.zoneId || "";
          body.zoneName = zone?.name || "";
          body.territory = form.territoryName;
          body.subDistributorName = form.subDistributorName;
          body.distributorName = form.subDistributorName;
          body.toEntityName = form.subDistributorName;
          body.note = `Business Type: ${form.businessType || "-"}, Business Name: ${form.businessName || "-"}, Address: ${form.address || "-"}`;
        }
      }

      await apiFetch("/inventory/transactions", { method: "POST", body });
      setOk("✅ Saved.");
      setForm((s) => ({ ...s, adjustment: "0", items: [{ ...blankItem }] }));
      await loadAll();
    } catch (e2) {
      setErr(e2.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this record?")) return;
    await apiFetch(`/inventory/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((row) => row._id !== id));
  }

  async function updateMinStock(productDbId, value) {
    const product = products.find((p) => p._id === productDbId);
    if (!product) return;
    await apiFetch(`/products/${productDbId}`, { method: "PUT", body: { ...product, minStockLevel: Number(value || 0) } });
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
            {cards.map((c) => <button key={c.key} type="button" onClick={() => setSelectedCard(c.key)} className={`rounded-lg border p-2 text-left text-sm ${selectedCard === c.key ? "bg-emerald-50 border-emerald-300" : "hover:bg-zinc-50"}`}>{c.title}</button>)}
          </div>
        </section>

        {["PURCHASING_STOCK", "SALE_STOCK", "DAMAGE_STOCK", "RETURN_STOCK", "RETURN_TO_SD"].includes(selectedCard) ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submit}>
              {selectedCard === "PURCHASING_STOCK" ? <>
                <Input label="From" value={form.fromEntityName} onChange={(v) => setField("fromEntityName", v)} />
                <Select label="To (Warehouse)" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
              </> : null}

              {selectedCard === "SALE_STOCK" ? <>
                <div className="md:col-span-2 flex gap-2">{saleModes.map((m) => <button key={m.key} type="button" onClick={() => setSaleMode(m.key)} className={`rounded border px-2 py-1 text-xs ${saleMode===m.key?"bg-emerald-50 border-emerald-300":""}`}>{m.label}</button>)}</div>
                <Select label="From (Warehouse)" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
                {saleMode === "brand" ? <>
                  <Select label="Business Type" value={form.businessType} onChange={(v) => setField("businessType", v)} options={businessTypes.map((x) => ({ value: x, label: x }))} />
                  <Select label="Business Name" value={form.businessUserId} onChange={(v) => setField("businessUserId", v)} options={brandBusinessUsers.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))} />
                  <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                </> : null}
                {saleMode !== "brand" ? <>
                  <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                  <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))} />
                  <Select label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} options={territoriesForZone.map((t) => ({ value: t, label: t }))} />
                  {saleMode === "distributor" ? <Select label="Distributor Name" value={form.distributorUserId} onChange={(v) => setField("distributorUserId", v)} options={distributorsForTerritory.map((u) => ({ value: u._id, label: u.businessName || u.fullName }))} /> : null}
                  {saleMode === "subDistributor" ? <>
                    <Input label="Sub-Distributor Name" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
                    <Input label="Business Type" value={form.businessType} onChange={(v) => setField("businessType", v)} />
                    <Input label="Business Name" value={form.businessName} onChange={(v) => setField("businessName", v)} />
                  </> : null}
                  <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                </> : null}
              </> : null}

              {selectedCard === "DAMAGE_STOCK" ? <Select label="Warehouse" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} /> : null}
              {["RETURN_STOCK", "RETURN_TO_SD"].includes(selectedCard) ? <Select label="Warehouse" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} /> : null}

              <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />

              <div className="md:col-span-2">
                <div className="font-semibold text-sm mb-2">Product Detail</div>
                {form.items.map((item, i) => {
                  const product = products.find((p) => p._id === item.productId);
                  return (
                    <div key={i} className="grid md:grid-cols-7 gap-2 border rounded-lg p-2 mb-2">
                      <Select label="Product Name" value={item.productId} onChange={(v) => setItem(i, "productId", v)} options={products.map((p) => ({ value: p._id, label: p.name }))} />
                      {selectedCard === "DAMAGE_STOCK" ? <>
                        <Input label="Size" value={product?.size || ""} onChange={() => {}} readOnly />
                        <Input label="Quantity" type="number" value={item.quantity} onChange={(v) => setItem(i, "quantity", v)} />
                        <Input label="Manufacture Date" type="date" value={item.manufactureDate} onChange={(v) => setItem(i, "manufactureDate", v)} />
                        <Input label="Expiry Date" type="date" value={item.expiryDate} onChange={(v) => setItem(i, "expiryDate", v)} />
                        <div />
                      </> : <>
                        <Input label="Carton Size" value={item.cartonSize} onChange={(v) => setItem(i, "cartonSize", v)} />
                        <Input label="1 Pack Price" type="number" value={item.onePackPrice} onChange={(v) => setItem(i, "onePackPrice", v)} />
                        <Input label="1 Carton Price" type="number" value={item.oneCartonPrice} onChange={(v) => setItem(i, "oneCartonPrice", v)} />
                        <Input label="Total Price" type="number" value={item.totalPrice} onChange={(v) => setItem(i, "totalPrice", v)} />
                        {selectedCard === "PURCHASING_STOCK" ? <Input label="Manufacture Date" type="date" value={item.manufactureDate} onChange={(v) => setItem(i, "manufactureDate", v)} /> : <div />}
                        {["PURCHASING_STOCK", "DAMAGE_STOCK"].includes(selectedCard) ? <Input label="Expiry Date" type="date" value={item.expiryDate} onChange={(v) => setItem(i, "expiryDate", v)} /> : <div />}
                      </>}
                      <button type="button" className="rounded border px-2 py-1 mt-6" onClick={() => removeItem(i)}>Remove</button>
                    </div>
                  );
                })}
                <button type="button" className="rounded border px-2 py-1" onClick={addItem}>+ Add product</button>
              </div>

              <div className="md:col-span-2"><button disabled={saving || loading} className="rounded bg-zinc-900 text-white px-4 py-2">Save</button></div>
            </form>
          </section>
        ) : null}

        {selectedCard === "DAMAGE_STOCK" ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Near to expire products</h3>
            <div className="overflow-x-auto mt-2">
              <table className="min-w-full text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Product Name</th><th className="p-2 text-left">Quantity</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Manufacture date</th><th className="p-2 text-left">Expiry date</th></tr></thead><tbody>{nearExpiry.map((r, idx)=><tr key={idx} className="border-b"><td className="p-2">{r.productName}</td><td className="p-2">{r.quantity}</td><td className="p-2">{r.warehouseName}</td><td className="p-2">{r.manufactureDate?new Date(r.manufactureDate).toLocaleDateString():"-"}</td><td className="p-2">{r.expiryDate?new Date(r.expiryDate).toLocaleDateString():"-"}</td></tr>)}</tbody></table>
            </div>
          </section>
        ) : null}

        {selectedCard === "W2W_TRANSFER" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Warehouse to Warehouse Transfer</h3><TransferTable rows={transfers} /></section> : null}
        {selectedCard === "STOCK_SUMMARY" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Stock Summary</h3><SummaryTable rows={summary} products={products} onUpdateMin={updateMinStock} /></section> : null}
        {selectedCard === "LOW_STOCK" ? <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold">Low Stock Alert</h3><LowStockTable rows={lowStock} /></section> : null}

        {["PURCHASING_STOCK", "SALE_STOCK", "DAMAGE_STOCK", "RETURN_STOCK", "RETURN_TO_SD"].includes(selectedCard) ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{cards.find((c) => c.key === selectedCard)?.title} Ledger</h3>
            <LedgerTable type={selectedCard} rows={cardTx} onDelete={deleteRecord} />
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}

function LedgerTable({ type, rows, onDelete }) {
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
              <td className="p-2"><button className="rounded border border-red-300 text-red-700 px-2 py-1" onClick={() => onDelete(r._id)}>Delete</button></td>
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
