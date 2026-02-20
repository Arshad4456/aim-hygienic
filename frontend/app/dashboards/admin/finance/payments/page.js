"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import UserDashboardShell from "../../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../../searchItems";
import { apiFetch } from "../../../../lib/api";
import { getAuthItem } from "../../../../lib/clientAuth";

const initialPrimaryForm = {
  regionId: "",
  zoneId: "",
  territoryId: "",
  distributorId: "",
  warehouseId: "",
  amount: "",
  payDate: "",
  returnDate: "",
  details: "",
};

const initialSecondaryForm = {
  regionId: "",
  zoneId: "",
  territoryId: "",
  distributorId: "",
  warehouseId: "",
  amountPaid: "",
  paidDate: "",
  primaryInvoiceNo: "",
  details: "",
};


function formatDashboardError(error, isWarehouseManagerView) {
  const raw = String(error?.message || "").trim();
  if (!raw) return "Something went wrong. Please try again.";

  if (/forbidden/i.test(raw)) {
    if (isWarehouseManagerView) {
      return "Forbidden: You can only access payment records for your assigned warehouse.";
    }
    return "Forbidden";
  }

  return raw;
}

export default function PaymentManagementPage() {
  const pathname = usePathname();
  const isWarehouseManagerView = pathname?.startsWith("/dashboards/warehouseManager");

  const [tab, setTab] = useState(pathname?.endsWith("/secondary") ? "secondary" : "primary");
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [distributors, setDistributors] = useState([]);

  const userWarehouseId = useMemo(() => {
    const raw = getAuthItem("aim_user");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      return String(parsed?.warehouseId || "").trim();
    } catch {
      return "";
    }
  }, []);

  const [primaryForm, setPrimaryForm] = useState(() => ({ ...initialPrimaryForm, warehouseId: isWarehouseManagerView ? userWarehouseId : "" }));
  const [secondaryForm, setSecondaryForm] = useState(() => ({ ...initialSecondaryForm, warehouseId: isWarehouseManagerView ? userWarehouseId : "" }));
  const [primaryLedger, setPrimaryLedger] = useState([]);
  const [secondaryLedger, setSecondaryLedger] = useState([]);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [err, setErr] = useState("");

  const scopedWarehouses = useMemo(() => {
    if (!isWarehouseManagerView || !userWarehouseId) return warehouses;
    return warehouses.filter((w) => String(w._id) === String(userWarehouseId));
  }, [isWarehouseManagerView, userWarehouseId, warehouses]);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [regionData, zoneData, territoryData, warehouseData, userData] = await Promise.all([
          apiFetch("/regions"),
          apiFetch("/zones"),
          apiFetch("/areas"),
          apiFetch("/warehouses"),
          apiFetch("/users?role=Distributor"),
        ]);
        setRegions(regionData.regions || []);
        setZones(zoneData.zones || []);
        setTerritories(territoryData.areas || []);
        setWarehouses(warehouseData.warehouses || []);
        setDistributors((userData.users || []).filter((row) => row.role === "Distributor"));
      } catch (error) {
        setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to load master data");
      }
    }
    loadMasters();
  }, []);


  async function loadLedgers() {
    try {
      const [primaryData, secondaryData] = await Promise.all([apiFetch("/payments/primary"), apiFetch("/payments/secondary")]);
      setPrimaryLedger(primaryData.primaryPayments || []);
      setSecondaryLedger(secondaryData.secondaryPayments || []);
    } catch (error) {
      setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to load payment ledgers");
    }
  }

  useEffect(() => {
    async function bootLedgers() {
      await loadLedgers();
    }
    bootLedgers();
  }, []);

  const primaryZones = useMemo(
    () => zones.filter((z) => !primaryForm.regionId || z.regionId === findRegionCode(primaryForm.regionId, regions)),
    [zones, primaryForm.regionId, regions]
  );
  const primaryTerritories = useMemo(
    () => territories.filter((t) => !primaryForm.zoneId || t.zoneId === findZoneCode(primaryForm.zoneId, zones)),
    [territories, primaryForm.zoneId, zones]
  );
  const primaryDistributors = useMemo(
    () => distributors.filter((d) => !primaryForm.territoryId || d.territoryId === findTerritoryCode(primaryForm.territoryId, territories)),
    [distributors, primaryForm.territoryId, territories]
  );

  const secondaryZones = useMemo(
    () => zones.filter((z) => !secondaryForm.regionId || z.regionId === findRegionCode(secondaryForm.regionId, regions)),
    [zones, secondaryForm.regionId, regions]
  );
  const secondaryTerritories = useMemo(
    () => territories.filter((t) => !secondaryForm.zoneId || t.zoneId === findZoneCode(secondaryForm.zoneId, zones)),
    [territories, secondaryForm.zoneId, zones]
  );
  const secondaryDistributors = useMemo(
    () => distributors.filter((d) => !secondaryForm.territoryId || d.territoryId === findTerritoryCode(secondaryForm.territoryId, territories)),
    [distributors, secondaryForm.territoryId, territories]
  );
  const matchingPrimaryInvoices = useMemo(
    () =>
      primaryLedger.filter(
        (item) =>
          (!secondaryForm.distributorId || String(item.distributorId) === String(secondaryForm.distributorId)) &&
          (!secondaryForm.warehouseId || String(item.warehouseId) === String(secondaryForm.warehouseId))
      ),
    [primaryLedger, secondaryForm.distributorId, secondaryForm.warehouseId]
  );

  function onPrimaryCascade(field, value) {
    setPrimaryForm((s) => {
      if (field === "regionId") return { ...s, regionId: value, zoneId: "", territoryId: "", distributorId: "" };
      if (field === "zoneId") return { ...s, zoneId: value, territoryId: "", distributorId: "" };
      if (field === "territoryId") return { ...s, territoryId: value, distributorId: "" };
      return { ...s, [field]: value };
    });
  }

  function onSecondaryCascade(field, value) {
    setSecondaryForm((s) => {
      if (field === "regionId") return { ...s, regionId: value, zoneId: "", territoryId: "", distributorId: "", primaryInvoiceNo: "" };
      if (field === "zoneId") return { ...s, zoneId: value, territoryId: "", distributorId: "", primaryInvoiceNo: "" };
      if (field === "territoryId") return { ...s, territoryId: value, distributorId: "", primaryInvoiceNo: "" };
      if (field === "distributorId" || field === "warehouseId") return { ...s, [field]: value, primaryInvoiceNo: "" };
      return { ...s, [field]: value };
    });
  }

  async function savePrimary(e) {
    e.preventDefault();
    try {
      setErr("");
      const payload = isWarehouseManagerView ? { ...primaryForm, warehouseId: userWarehouseId } : primaryForm;
      await apiFetch("/payments/primary", { method: "POST", body: payload });
      setPrimaryForm({ ...initialPrimaryForm, warehouseId: isWarehouseManagerView ? userWarehouseId : "" });
      await loadLedgers();
    } catch (error) {
      setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to save primary payment");
    }
  }

  async function saveSecondary(e) {
    e.preventDefault();
    try {
      setErr("");
      const payload = isWarehouseManagerView ? { ...secondaryForm, warehouseId: userWarehouseId } : secondaryForm;
      await apiFetch("/payments/secondary", { method: "POST", body: payload });
      setSecondaryForm({ ...initialSecondaryForm, warehouseId: isWarehouseManagerView ? userWarehouseId : "" });
      await loadLedgers();
    } catch (error) {
      setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to save secondary payment");
    }
  }

  async function deletePrimary(id) {
    if (!confirm("Delete this primary payment?")) return;
    try {
      await apiFetch(`/payments/primary/${id}`, { method: "DELETE" });
      await loadLedgers();
    } catch (error) {
      setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to delete primary payment");
    }
  }

  async function deleteSecondary(id) {
    if (!confirm("Delete this secondary payment?")) return;
    try {
      await apiFetch(`/payments/secondary/${id}`, { method: "DELETE" });
      await loadLedgers();
    } catch (error) {
      setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to delete secondary payment");
    }
  }

  async function openInvoice(invoiceNo) {
    try {
      const data = await apiFetch(`/payments/primary/${invoiceNo}`);
      setInvoiceDetail(data);
    } catch (error) {
      setErr(formatDashboardError(error, isWarehouseManagerView) || "Failed to load invoice");
    }
  }

  const ShellComponent = isWarehouseManagerView ? UserDashboardShell : AdminShell;
  const shellProps = isWarehouseManagerView
    ? {
        title: "Payment Management",
        subtitle: "Manage warehouse-scoped primary and secondary payments for your warehouse.",
        roleKey: "Warehouse Manager",
        links: userDashboardSearchItems.warehouseManager || [],
      }
    : { title: "Payment Management", user: null };

  return (
    <ShellComponent {...shellProps}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Payment Management</div>
          <div className="mt-1 text-sm text-zinc-500">Manage primary (warehouse to distributor) and secondary (distributor settlements) payments.</div>
          <div className="mt-4 flex gap-2">
            <button className={`rounded-xl px-4 py-2 text-sm ${tab === "primary" ? "bg-emerald-600 text-white" : "border"}`} type="button" onClick={() => setTab("primary")}>Primary Payment</button>
            <button className={`rounded-xl px-4 py-2 text-sm ${tab === "secondary" ? "bg-emerald-600 text-white" : "border"}`} type="button" onClick={() => setTab("secondary")}>Secondary Payment</button>
          </div>
          {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
        </div>

        {tab === "primary" ? (
          <>
            <PaymentForm title="Add Primary Payment" onSubmit={savePrimary} submitText="Save Payment">
              <CascadeSelect label="Region" value={primaryForm.regionId} onChange={(v) => onPrimaryCascade("regionId", v)} options={regions} />
              <CascadeSelect label="Zone" value={primaryForm.zoneId} onChange={(v) => onPrimaryCascade("zoneId", v)} options={primaryZones} />
              <CascadeSelect label="Territory" value={primaryForm.territoryId} onChange={(v) => onPrimaryCascade("territoryId", v)} options={primaryTerritories} />
              <CascadeSelect label="Distributor Name" value={primaryForm.distributorId} onChange={(v) => onPrimaryCascade("distributorId", v)} options={primaryDistributors} user />
              <CascadeSelect label="Warehouse Name" value={primaryForm.warehouseId} onChange={(v) => onPrimaryCascade("warehouseId", v)} options={scopedWarehouses} warehouse disabled={isWarehouseManagerView} />
              <Input label="Amount" type="number" value={primaryForm.amount} onChange={(v) => onPrimaryCascade("amount", v)} />
              <Input label="Pay Date" type="date" value={primaryForm.payDate} onChange={(v) => onPrimaryCascade("payDate", v)} />
              <Input label="Return Date" type="date" value={primaryForm.returnDate} onChange={(v) => onPrimaryCascade("returnDate", v)} />
              <TextArea label="Detail of Payment" value={primaryForm.details} onChange={(v) => onPrimaryCascade("details", v)} />
            </PaymentForm>
            <PrimaryLedger rows={primaryLedger} onDelete={deletePrimary} onInvoice={openInvoice} />
          </>
        ) : (
          <>
            <PaymentForm title="Add Secondary Payment" onSubmit={saveSecondary} submitText="Save Payment">
              <CascadeSelect label="Region" value={secondaryForm.regionId} onChange={(v) => onSecondaryCascade("regionId", v)} options={regions} />
              <CascadeSelect label="Zone" value={secondaryForm.zoneId} onChange={(v) => onSecondaryCascade("zoneId", v)} options={secondaryZones} />
              <CascadeSelect label="Territory" value={secondaryForm.territoryId} onChange={(v) => onSecondaryCascade("territoryId", v)} options={secondaryTerritories} />
              <CascadeSelect label="Distributor Name" value={secondaryForm.distributorId} onChange={(v) => onSecondaryCascade("distributorId", v)} options={secondaryDistributors} user />
              <CascadeSelect label="Warehouse Name" value={secondaryForm.warehouseId} onChange={(v) => onSecondaryCascade("warehouseId", v)} options={scopedWarehouses} warehouse disabled={isWarehouseManagerView} />
              <Input label="Amount Paid" type="number" value={secondaryForm.amountPaid} onChange={(v) => onSecondaryCascade("amountPaid", v)} />
              <Input label="Date of Paid" type="date" value={secondaryForm.paidDate} onChange={(v) => onSecondaryCascade("paidDate", v)} />
              <div>
                <Label>Invoice-No of Primary Payment</Label>
                <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={secondaryForm.primaryInvoiceNo} onChange={(e) => onSecondaryCascade("primaryInvoiceNo", e.target.value)} required>
                  <option value="">Select invoice</option>
                  {matchingPrimaryInvoices.map((item) => (
                    <option key={item._id} value={item.invoiceNo}>{item.invoiceNo} (Remaining: {formatCurrency(item.amountRemaining)})</option>
                  ))}
                </select>
              </div>
              <TextArea label="Detail of Payment" value={secondaryForm.details} onChange={(v) => onSecondaryCascade("details", v)} />
            </PaymentForm>
            <SecondaryLedger rows={secondaryLedger} onDelete={deleteSecondary} onInvoice={openInvoice} />
          </>
        )}
      </div>

      {invoiceDetail?.primaryPayment ? <InvoiceModal data={invoiceDetail} onClose={() => setInvoiceDetail(null)} /> : null}
    </ShellComponent>
  );
}

function PaymentForm({ title, children, onSubmit, submitText }) {
  return <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm"><div className="text-lg font-semibold text-zinc-900">{title}</div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">{submitText}</button></form>;
}

function CascadeSelect({ label, value, onChange, options, user, warehouse, disabled = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required>
        <option value="">Select {label}</option>
        {options.map((item) => <option key={item._id} value={item._id}>{user ? item.fullName : warehouse ? item.name : item.name}</option>)}
      </select>
    </div>
  );
}

function Input({ label, value, onChange, type }) {
  return <div><Label>{label}</Label><input required className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function TextArea({ label, value, onChange }) {
  return <div className="md:col-span-2"><Label>{label}</Label><textarea className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" rows={3} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Label({ children }) {
  return <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">{children}</label>;
}

function PrimaryLedger({ rows, onDelete, onInvoice }) {
  return <LedgerTable title="Primary Payment Ledger" headers={["Invoice-No", "Amount", "Pay Date", "Return Date", "Action"]} empty="No primary payments yet." rows={rows.map((row) => [row.invoiceNo, formatCurrency(row.amountTotal), formatDate(row.payDate), formatDate(row.returnDate), <div key={row._id} className="flex gap-2"><button type="button" onClick={() => onInvoice(row.invoiceNo)} className="rounded border px-2 py-1 text-xs">Invoice/Receipt</button><button type="button" onClick={() => onDelete(row._id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Delete</button></div>])} />;
}

function SecondaryLedger({ rows, onDelete, onInvoice }) {
  return <LedgerTable title="Secondary Payment Ledger" headers={["Invoice-No", "Paid Amount", "Date", "Action"]} empty="No secondary settlements yet." rows={rows.map((row) => [row.primaryInvoiceNo, formatCurrency(row.amountPaid), formatDate(row.paidDate), <div key={row._id} className="flex gap-2"><button type="button" onClick={() => onInvoice(row.primaryInvoiceNo)} className="rounded border px-2 py-1 text-xs">Invoice/Receipt</button><button type="button" onClick={() => onDelete(row._id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">Delete</button></div>])} />;
}

function LedgerTable({ title, headers, rows, empty }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold text-zinc-900">{title}</div>
      <div className="mt-3 overflow-auto rounded-xl border">
        <table className="min-w-[760px] w-full text-sm"><thead className="bg-zinc-50"><tr>{headers.map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((cells, idx) => <tr key={idx}>{cells.map((cell, c) => <td key={c} className="border-b px-3 py-2">{cell}</td>)}</tr>) : <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={headers.length}>{empty}</td></tr>}</tbody></table>
      </div>
    </div>
  );
}

function InvoiceModal({ data, onClose }) {
  const primary = data.primaryPayment;
  const settlements = data.settlements || [];

  function onPrint() {
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) {
      alert("Please allow popups to print invoice/receipt.");
      return;
    }
    popup.document.write(buildInvoiceHtml(primary, settlements));
    popup.document.close();
    popup.print();
  }

  function onDownload() {
    const html = buildInvoiceHtml(primary, settlements);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${primary.invoiceNo || "payment-invoice"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><div className="text-lg font-semibold">Invoice {primary.invoiceNo}</div><div className="flex items-center gap-2"><button type="button" onClick={onDownload} className="rounded border px-3 py-1 text-sm">Download</button><button type="button" onClick={onPrint} className="rounded border px-3 py-1 text-sm">Print</button><button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">Close</button></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div>Distributor: {primary.distributorName}</div><div>Warehouse: {primary.warehouseName}</div><div className="col-span-2">Distributor Address: {primary.distributorAddress || "—"}</div><div>Region/Zone/Territory: {primary.regionName} / {primary.zoneName} / {primary.territoryName}</div><div>Pay Date: {formatDate(primary.payDate)}</div><div>Return Date: {formatDate(primary.returnDate)}</div><div>Amount Total: {formatCurrency(primary.amountTotal)}</div><div className="col-span-2">Details: {primary.details || "—"}</div></div>
        <div className="mt-4 text-sm font-medium">Settlement Details</div>
        <div className="mt-2 overflow-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-zinc-50"><tr><th className="border-b px-3 py-2 text-left">Paid Amount</th><th className="border-b px-3 py-2 text-left">Paid Date</th><th className="border-b px-3 py-2 text-left">Detail</th></tr></thead><tbody>{settlements.length ? settlements.map((row) => <tr key={row._id}><td className="border-b px-3 py-2">{formatCurrency(row.amountPaid)}</td><td className="border-b px-3 py-2">{formatDate(row.paidDate)}</td><td className="border-b px-3 py-2">{row.details || "—"}</td></tr>) : <tr><td colSpan={3} className="px-3 py-4 text-center text-zinc-500">No settlement payments yet.</td></tr>}</tbody></table></div>
        <div className="mt-4 text-sm">Total Paid Back: <b>{formatCurrency(primary.amountPaidBack)}</b> • Remaining Amount: <b>{formatCurrency(primary.amountRemaining)}</b></div>
      </div>
    </div>
  );
}

function buildInvoiceHtml(primary, settlements) {
  const settlementRows = settlements.length > 0 ? settlements.map((row, idx) => `<tr><td>${idx + 1}</td><td>${formatCurrency(row.amountPaid)}</td><td>${formatDate(row.paidDate)}</td><td>${escapeHtml(row.details || "-")}</td></tr>`).join("") : '<tr><td colspan="4" style="text-align:center;">No settlement payments yet.</td></tr>';

  return `<html><body style="font-family:Arial,sans-serif;padding:16px;color:#111;"><div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div><div><div style="font-weight:700;font-size:18px;">AIM Hygienic (Pvt) Limited</div><div style="font-size:11px;color:#555;">Payment Invoice / Receipt</div></div></div><div style="font-size:12px;text-align:right;"><div><b>Invoice No:</b> ${escapeHtml(primary.invoiceNo || "-")}</div><div><b>Date:</b> ${formatDate(primary.payDate)}</div></div></div><div style="margin-top:12px;font-size:12px;"><b>Invoice From:</b> ${escapeHtml(primary.warehouseName || "-")}</div><div style="font-size:12px;"><b>Bill To:</b> ${escapeHtml(primary.distributorName || "-")}</div><div style="font-size:12px;"><b>Distributor Address:</b> ${escapeHtml(primary.distributorAddress || "-")}</div><div style="font-size:12px;"><b>Region/Zone/Territory:</b> ${escapeHtml(primary.regionName || "-")} / ${escapeHtml(primary.zoneName || "-")} / ${escapeHtml(primary.territoryName || "-")}</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:12px;font-size:12px;"><tbody><tr><td><b>Total Primary Amount</b></td><td>${formatCurrency(primary.amountTotal)}</td><td><b>Pay Date</b></td><td>${formatDate(primary.payDate)}</td></tr><tr><td><b>Return Date</b></td><td>${formatDate(primary.returnDate)}</td><td><b>Details</b></td><td>${escapeHtml(primary.details || "-")}</td></tr><tr><td><b>Total Paid Back</b></td><td>${formatCurrency(primary.amountPaidBack)}</td><td><b>Remaining Amount</b></td><td>${formatCurrency(primary.amountRemaining)}</td></tr></tbody></table><div style="margin-top:14px;font-weight:700;">Settlement Details</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:8px;font-size:12px;"><thead><tr><th>#</th><th>Paid Amount</th><th>Paid Date</th><th>Detail</th></tr></thead><tbody>${settlementRows}</tbody></table><div style="margin-top:20px;text-align:center;font-size:12px;">Thank you for business with AIM Hygienic (Pvt) Limited.</div></body></html>`;
}

function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatCurrency(value) {
  return `₨ ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function findRegionCode(id, regions) {
  return regions.find((r) => r._id === id)?.regionId || "";
}

function findZoneCode(id, zones) {
  return zones.find((z) => z._id === id)?.zoneId || "";
}

function findTerritoryCode(id, territories) {
  return territories.find((t) => t._id === id)?.areaId || "";
}