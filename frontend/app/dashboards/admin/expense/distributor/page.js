"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import { getAuthItem } from "../../../../lib/clientAuth";

const tabs = [
  { key: "builty", label: "Builty Expense" },
  { key: "credit_note", label: "Credit Note Expense" },
  { key: "support", label: "Additional Support" },
  { key: "claim_discount", label: "Claims" },
];

export default function DistributorExpensePage() {
  const [active, setActive] = useState("builty");
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filters, setFilters] = useState({ distributorId: "all", fromDate: "", toDate: "" });
  const [form, setForm] = useState({ distributorId: "", territory: "", expenseDate: "", amount: "", paidTo: "", paymentMethod: "cash", fromAccountId: "", description: "", referenceNo: "", attachmentUrl: "", reason: "", employeeType: "Promoter", supportPeriod: "", claimType: "Discount Claim" });

  useEffect(() => {
    Promise.all([apiFetch("/expenses?section=distributor"), apiFetch("/accounts"), apiFetch("/users")])
      .then(([a, b, c]) => {
        setRows(a.expenses || []);
        setAccounts(b.accounts || []);
        setDistributors((c.users || []).filter((u) => String(u.role || "").toLowerCase().includes("distributor")));
      })
      .catch(() => {});
  }, []);

  const territoryOptions = useMemo(() => {
    const names = new Set();
    distributors.forEach((d) => {
      const name = getDistributorTerritory(d);
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [distributors]);

  const filteredDistributors = useMemo(() => {
    if (!form.territory) return [];
    return distributors.filter((d) => getDistributorTerritory(d) === form.territory);
  }, [distributors, form.territory]);

  const distributorMap = useMemo(() => {
    const m = {};
    distributors.forEach((d) => {
      m[d._id] = distributorName(d);
    });
    return m;
  }, [distributors]);

  const approvedRows = useMemo(
    () => rows.filter((r) => ["approved", "posted", "paid"].includes(String(r.status || "").toLowerCase())),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
    const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;

    return rows.filter((row) => {
      if (filters.distributorId !== "all" && String(row.distributorId || "") !== filters.distributorId) return false;
      const d = new Date(row.expenseDate || row.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, filters]);

  const filteredApprovedRows = useMemo(
    () => filteredRows.filter((r) => ["approved", "posted", "paid"].includes(String(r.status || "").toLowerCase())),
    [filteredRows]
  );

  const monthlyDistributorTotals = useMemo(
    () =>
      approvedRows.reduce((m, r) => {
        const key = distributorMap[r.distributorId] || "Unknown";
        m[key] = (m[key] || 0) + Number(r.amount || 0);
        return m;
      }, {}),
    [approvedRows, distributorMap]
  );

  const perMonthTotalExpense = useMemo(() => {
    const grouped = filteredApprovedRows.reduce((acc, row) => {
      const d = new Date(row.expenseDate || row.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      acc[monthKey] = (acc[monthKey] || 0) + Number(row.amount || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [filteredApprovedRows]);

  async function save(e) {
    e.preventDefault();
    const status = active === "support" || active.startsWith("claim") ? "pending" : "posted";
    const subType = active === "claim_discount" ? claimSubType(form.claimType) : active;
    const dist = distributors.find((d) => d._id === form.distributorId);

    const payload = {
      section: "distributor",
      subType,
      category: active,
      distributorId: form.distributorId,
      territory: form.territory || getDistributorTerritory(dist) || "",
      expenseDate: form.expenseDate,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paymentMode: form.paymentMethod === "online" ? "bank_transfer" : form.paymentMethod,
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      paymentReference: form.referenceNo,
      description: form.description,
      notes: `${form.reason} ${form.description}`.trim(),
      attachmentUrl: form.attachmentUrl,
      linkReference: form.referenceNo,
      approvalRequired: status === "pending",
      status,
      title: `Distributor ${tabs.find((t) => t.key === active)?.label || "expense"}`,
      expenseId: `DST-${Date.now()}`,
      metadata: { reason: form.reason, employeeType: form.employeeType, supportPeriod: form.supportPeriod, claimType: form.claimType },
    };

    const r = await apiFetch("/expenses", { method: "POST", body: payload });
    setRows((s) => [r.expense, ...s]);
  }

  async function onDelete(id) {
    if (!confirm("Delete this distributor expense record?")) return;
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    setRows((s) => s.filter((r) => r._id !== id));
  }

  async function updateStatus(row, nextStatus) {
    const me = JSON.parse(getAuthItem("aim_user") || "{}");
    const payload = {
      ...row,
      status: nextStatus,
      approvedBy: nextStatus === "approved" ? (me.fullName || me.name || me.username || "Admin") : row.approvedBy,
      approvedAt: nextStatus === "approved" ? new Date().toISOString() : row.approvedAt,
    };
    const res = await apiFetch(`/expenses/${row._id}`, { method: "PUT", body: payload });
    setRows((state) => state.map((item) => (item._id === row._id ? res.expense : item)));
  }

  return (
    <AdminShell title="Distributor Expense" user={null}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5">
          <h1 className="text-xl font-semibold">Distributor Expense</h1>
          <p className="text-sm text-zinc-500">Monthly reimbursement, structured claims, and approval-driven support entries.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button type="button" key={t.key} onClick={() => setActive(t.key)} className={`rounded-lg px-3 py-2 text-sm ${active === t.key ? "bg-emerald-600 text-white" : "border hover:bg-zinc-50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select label="Territory/Region" value={form.territory} onChange={(v) => setForm((s) => ({ ...s, territory: v, distributorId: "" }))} options={[{ value: "", label: "Select territory" }, ...territoryOptions.map((t) => ({ value: t, label: t }))]} required />
            <Select label="Distributor" value={form.distributorId} onChange={(v) => setForm((s) => ({ ...s, distributorId: v }))} disabled={!form.territory} options={[{ value: "", label: form.territory ? "Select distributor" : "Select territory first" }, ...filteredDistributors.map((d) => ({ value: d._id, label: distributorName(d) }))]} required />
            <Input label="Date" type="date" value={form.expenseDate} onChange={(v) => setForm((s) => ({ ...s, expenseDate: v }))} required />
            <Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm((s) => ({ ...s, amount: v }))} required />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))} options={[{ value: "cash", label: "Cash" }, { value: "online", label: "Online" }, { value: "cheque", label: "Cheque" }]} />
            <Select label="Paid From Account" value={form.fromAccountId} onChange={(v) => setForm((s) => ({ ...s, fromAccountId: v }))} options={[{ value: "", label: "Select account" }, ...accounts.map((a) => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))]} />
            <Input label={active === "builty" ? "Builty No / LR No" : active === "credit_note" ? "Credit Note No" : "Reference"} value={form.referenceNo} onChange={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
            <Input label="Paid To / Transporter / Payee" value={form.paidTo} onChange={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
            <Input label="Reason" value={form.reason} onChange={(v) => setForm((s) => ({ ...s, reason: v }))} />
            {active === "support" ? <Select label="Employee Type" value={form.employeeType} onChange={(v) => setForm((s) => ({ ...s, employeeType: v }))} options={[{ value: "Promoter", label: "Promoter" }, { value: "Helper", label: "Helper" }, { value: "Loader", label: "Loader" }, { value: "Other", label: "Other" }]} /> : null}
            {active === "support" ? <Input label="Support Period" value={form.supportPeriod} onChange={(v) => setForm((s) => ({ ...s, supportPeriod: v }))} /> : null}
            {active === "claim_discount" ? <Select label="Claim Type" value={form.claimType} onChange={(v) => setForm((s) => ({ ...s, claimType: v }))} options={[{ value: "Discount Claim", label: "Discount Claim" }, { value: "Offer Claim", label: "Offer Claim" }, { value: "Coupon Claim", label: "Coupon/Lucky Draw Claim" }]} /> : null}
            <div className="md:col-span-2"><Input label="Description / Notes" value={form.description} onChange={(v) => setForm((s) => ({ ...s, description: v }))} required /></div>
            <Input label="Attachment URL" value={form.attachmentUrl} onChange={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
            <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-white">Add {tabs.find((t) => t.key === active)?.label}</button></div>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select
              label="Filter Distributor"
              value={filters.distributorId}
              onChange={(v) => setFilters((s) => ({ ...s, distributorId: v }))}
              options={[{ value: "all", label: "All distributors" }, ...distributors.map((d) => ({ value: d._id, label: distributorName(d) }))]}
            />
            <Input label="From Date" type="date" value={filters.fromDate} onChange={(v) => setFilters((s) => ({ ...s, fromDate: v }))} />
            <Input label="To Date" type="date" value={filters.toDate} onChange={(v) => setFilters((s) => ({ ...s, toDate: v }))} />
            <div className="flex items-end">
              <button type="button" onClick={() => setFilters({ distributorId: "all", fromDate: "", toDate: "" })} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Reset Filters</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Object.entries(monthlyDistributorTotals)
            .slice(0, 3)
            .map(([dist, amount]) => (
              <div key={dist} className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">Approved total by distributor</div><div className="font-semibold">{dist}</div><div>PKR {Number(amount).toLocaleString()}</div></div>
            ))}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h3 className="font-semibold text-zinc-900">Per Month Total Expense (Approved/Posted/Paid)</h3>
          <div className="mt-3 overflow-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Month</th>
                  <th className="border-b px-3 py-2 text-left">Total Expense</th>
                </tr>
              </thead>
              <tbody>
                {perMonthTotalExpense.map((item) => (
                  <tr key={item.month}>
                    <td className="border-b px-3 py-2">{item.month}</td>
                    <td className="border-b px-3 py-2">PKR {Number(item.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {perMonthTotalExpense.length === 0 ? (
                  <tr><td colSpan={2} className="px-3 py-6 text-center text-zinc-500">No monthly totals for selected filters.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>{["Date", "Distributor", "Territory", "Type", "Reference", "Amount", "Status", "Approved By", "Attachment", "Actions"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r._id}>
                  <td className="border-b px-3 py-2">{fmtDate(r.expenseDate)}</td>
                  <td className="border-b px-3 py-2">{distributorMap[r.distributorId] || "-"}</td>
                  <td className="border-b px-3 py-2">{r.territory || "-"}</td>
                  <td className="border-b px-3 py-2">{r.subType}</td>
                  <td className="border-b px-3 py-2">{r.paymentReference || r.linkReference || "-"}</td>
                  <td className="border-b px-3 py-2">PKR {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="border-b px-3 py-2">{r.status}</td>
                  <td className="border-b px-3 py-2">{r.approvedBy || "-"}</td>
                  <td className="border-b px-3 py-2">{r.attachmentUrl ? <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View</a> : "-"}</td>
                  <td className="border-b px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedReceipt(r)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Receipt</button>
                      <button type="button" onClick={() => updateStatus(r, "approved")} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                      <button type="button" onClick={() => updateStatus(r, "rejected")} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">Reject</button>
                      <button type="button" onClick={() => onDelete(r._id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? <tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500">No distributor expenses for selected filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt ? (
        <Modal title="AIM Hygienic Distributor Expense Receipt" onClose={() => setSelectedReceipt(null)}>
          <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">AH</div><div><div className="text-lg font-bold">AIM Hygienic (Pvt) Limited</div><div className="text-xs text-zinc-500">Distributor Expense Receipt</div></div></div>
              <div className="text-right text-xs text-zinc-600"><div><b>Receipt #:</b> {selectedReceipt.expenseId || selectedReceipt._id}</div><div><b>Generated:</b> {new Date().toLocaleString()}</div></div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <ReceiptRow label="Date" value={fmtDate(selectedReceipt.expenseDate)} />
              <ReceiptRow label="Distributor" value={distributorMap[selectedReceipt.distributorId] || "-"} />
              <ReceiptRow label="Territory" value={selectedReceipt.territory || "-"} />
              <ReceiptRow label="Type" value={selectedReceipt.subType || "-"} />
              <ReceiptRow label="Amount" value={`PKR ${Number(selectedReceipt.amount || 0).toLocaleString()}`} />
              <ReceiptRow label="Payment Method" value={(selectedReceipt.paymentMethod || "-").toUpperCase()} />
              <ReceiptRow label="Paid To" value={selectedReceipt.paidTo || "-"} />
              <ReceiptRow label="Reference" value={selectedReceipt.paymentReference || selectedReceipt.linkReference || "-"} />
              <ReceiptRow label="Status" value={selectedReceipt.status || "-"} />
            </div>
            <div className="mt-3 border-t pt-3 text-sm"><div className="mb-1 font-semibold">Description / Notes</div><div className="text-zinc-700">{selectedReceipt.description || selectedReceipt.notes || "-"}</div></div>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-indigo-700">Print Receipt</button><button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg border px-4 py-2">Close</button></div>
        </Modal>
      ) : null}
    </AdminShell>
  );
}

function claimSubType(claimType) { if (claimType === "Offer Claim") return "claim_offer"; if (claimType === "Coupon Claim") return "claim_coupon"; return "claim_discount"; }
function distributorName(d) { return d?.fullName || d?.name || d?.businessName || d?.username || d?.mobile || "Distributor"; }
function getDistributorTerritory(d) { return d?.territoryName || d?.areaName || d?.zoneName || d?.regionName || ""; }
function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : "-"; }
function Input({ label, value, onChange, type = "text", required = false }) { return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>; }
function Select({ label, value, onChange, options, required = false, disabled = false }) { return <div><div className="text-sm font-medium">{label}</div><select required={required} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
function Modal({ title, children, onClose }) { return <div className="fixed inset-0 z-[65]"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div className="text-lg font-semibold">{title}</div><button onClick={onClose} className="rounded-md border px-2 py-1 text-sm">✕</button></div>{children}</div></div>; }
function ReceiptRow({ label, value }) { return <div className="flex justify-between border-b py-1"><span className="text-zinc-600">{label}</span><span className="text-right font-medium">{value}</span></div>; }