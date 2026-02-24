"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const buckets = ["current", "1_30", "31_60", "61_90", "91_120", "120_plus"];

function getBucket(daysOverdue) {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "1_30";
  if (daysOverdue <= 60) return "31_60";
  if (daysOverdue <= 90) return "61_90";
  if (daysOverdue <= 120) return "91_120";
  return "120_plus";
}

export default function FinanceAgingPage() {
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [party, setParty] = useState(null);
  const [filters, setFilters] = useState({ entityType: "both", status: "all", fromDate: "", toDate: "", asOfDate: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    let ignore = false;
    Promise.all([apiFetch("/orders?limit=500"), apiFetch("/receipts?status=approved")])
      .then(([o, r]) => {
        if (ignore) return;
        setOrders(o.orders || []);
        setReceipts(r.receipts || []);
      })
      .catch((e) => {
        if (ignore) return;
        setError(e.message || "Failed to load aging report");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const computed = useMemo(() => {
    const asOf = new Date(`${filters.asOfDate}T23:59:59`);
    const delivered = orders.filter((o) => String(o.status || "").toLowerCase() === "delivered");

    const items = delivered
      .filter((o) => {
        const t = String(o.saleType || "").toLowerCase();
        if (filters.entityType === "customer") return t === "secondary";
        if (filters.entityType === "distributor") return t === "primary";
        return true;
      })
      .filter((o) => {
        const invoiceDate = new Date(o.invoiceGeneratedAt || o.deliveredAt || o.updatedAt || o.createdAt || "1970-01-01T00:00:00Z");
        if (filters.fromDate && invoiceDate < new Date(`${filters.fromDate}T00:00:00`)) return false;
        if (filters.toDate && invoiceDate > new Date(`${filters.toDate}T23:59:59`)) return false;
        return true;
      })
      .map((o) => {
        const invoiceNo = o.invoiceNo || o.orderNo || String(o._id);
        const invoiceDate = new Date(o.invoiceGeneratedAt || o.deliveredAt || o.updatedAt || o.createdAt || "1970-01-01T00:00:00Z");
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        const paid = receipts
          .filter((r) => r.linkedInvoiceNo === invoiceNo || String(r.linkedOrderId || "") === String(o._id || ""))
          .reduce((s, r) => s + Number(r.amount || 0), 0);
        const total = Number(o.totalAmount || 0);
        const remaining = Math.max(0, total - paid);
        const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / 86400000);
        return {
          order: o,
          invoiceNo,
          partyName: o.distributorName || o.customerName || o.fromEntityName || "Unknown",
          partyType: String(o.saleType || "").toLowerCase() === "primary" ? "Distributor" : "Customer",
          invoiceDate,
          dueDate,
          total,
          paid,
          remaining,
          daysOverdue,
          bucket: getBucket(daysOverdue),
        };
      })
      .filter((x) => x.remaining > 0)
      .filter((x) => {
        if (filters.status === "all") return true;
        if (filters.status === "unpaid") return x.paid <= 0;
        if (filters.status === "partial") return x.paid > 0 && x.remaining > 0;
        return true;
      });

    const grouped = new Map();
    items.forEach((it) => {
      const key = `${it.partyType}:${it.partyName}`;
      if (!grouped.has(key)) grouped.set(key, { key, partyName: it.partyName, partyType: it.partyType, current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "91_120": 0, "120_plus": 0, total: 0, details: [] });
      const row = grouped.get(key);
      row[it.bucket] += it.remaining;
      row.total += it.remaining;
      row.details.push(it);
    });

    const table = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    const summary = table.reduce((acc, r) => {
      buckets.forEach((b) => { acc[b] += r[b]; });
      acc.total += r.total;
      return acc;
    }, { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "91_120": 0, "120_plus": 0, total: 0 });

    return { table, summary };
  }, [orders, receipts, filters]);

  return (
    <AdminShell title="Aging Report" user={null}>
      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">AR Aging Report</h1>
          <p className="text-sm text-zinc-500">Outstanding invoice balances with standard aging buckets.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniCard label="Total Outstanding" value={`PKR ${computed.summary.total.toLocaleString()}`} />
          <MiniCard label="Current" value={`PKR ${computed.summary.current.toLocaleString()}`} />
          <MiniCard label="1-30" value={`PKR ${computed.summary["1_30"].toLocaleString()}`} />
          <MiniCard label="31-60" value={`PKR ${computed.summary["31_60"].toLocaleString()}`} />
          <MiniCard label="61-90" value={`PKR ${computed.summary["61_90"].toLocaleString()}`} />
          <MiniCard label="91-120" value={`PKR ${computed.summary["91_120"].toLocaleString()}`} />
          <MiniCard label="120+" value={`PKR ${computed.summary["120_plus"].toLocaleString()}`} />
          <MiniCard label="Top Overdue" value={computed.table[0]?.partyName || "-"} />
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-zinc-50 p-3 md:grid-cols-6">
          <Select label="Entity Type" value={filters.entityType} onChange={(v) => setFilters((s) => ({ ...s, entityType: v }))} options={["both", "customer", "distributor"]} />
          <Select label="Status" value={filters.status} onChange={(v) => setFilters((s) => ({ ...s, status: v }))} options={["all", "unpaid", "partial"]} />
          <Input label="Invoice From" type="date" value={filters.fromDate} onChange={(v) => setFilters((s) => ({ ...s, fromDate: v }))} />
          <Input label="Invoice To" type="date" value={filters.toDate} onChange={(v) => setFilters((s) => ({ ...s, toDate: v }))} />
          <Input label="As Of Date" type="date" value={filters.asOfDate} onChange={(v) => setFilters((s) => ({ ...s, asOfDate: v }))} />
          <div className="flex items-end"><button onClick={() => setFilters({ entityType: "both", status: "all", fromDate: "", toDate: "", asOfDate: new Date().toISOString().slice(0, 10) })} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">Reset</button></div>
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="bg-zinc-50"><tr>{["Party", "Type", "Current", "1-30", "31-60", "61-90", "91-120", "120+", "Total", "Action"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500">Loading aging report...</td></tr> : computed.table.length === 0 ? <tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500">No outstanding records.</td></tr> : computed.table.map((r) => (
                <tr key={r.key}>
                  <td className="border-b px-3 py-2 font-medium">{r.partyName}</td><td className="border-b px-3 py-2">{r.partyType}</td>
                  <td className="border-b px-3 py-2">{r.current.toLocaleString()}</td><td className="border-b px-3 py-2">{r["1_30"].toLocaleString()}</td><td className="border-b px-3 py-2">{r["31_60"].toLocaleString()}</td><td className="border-b px-3 py-2">{r["61_90"].toLocaleString()}</td><td className="border-b px-3 py-2">{r["91_120"].toLocaleString()}</td><td className="border-b px-3 py-2">{r["120_plus"].toLocaleString()}</td>
                  <td className="border-b px-3 py-2 font-semibold">{r.total.toLocaleString()}</td>
                  <td className="border-b px-3 py-2"><button onClick={() => setParty(r)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">View Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {party ? (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setParty(null)} />
          <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Aging Details - {party.partyName}</h2><button onClick={() => setParty(null)} className="rounded-md border px-2 py-1 text-sm">✕</button></div>
            <div className="overflow-auto rounded-xl border">
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="bg-zinc-50"><tr>{["Invoice No", "Invoice Date", "Due Date", "Total", "Paid", "Remaining", "Days Overdue", "Bucket", "Action"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {party.details.map((d) => (
                    <tr key={d.invoiceNo + d.order._id}>
                      <td className="border-b px-3 py-2">{d.invoiceNo}</td><td className="border-b px-3 py-2">{d.invoiceDate.toLocaleDateString()}</td><td className="border-b px-3 py-2">{d.dueDate.toLocaleDateString()}</td>
                      <td className="border-b px-3 py-2">{d.total.toLocaleString()}</td><td className="border-b px-3 py-2">{d.paid.toLocaleString()}</td><td className="border-b px-3 py-2 font-semibold">{d.remaining.toLocaleString()}</td>
                      <td className="border-b px-3 py-2">{d.daysOverdue}</td><td className="border-b px-3 py-2">{d.bucket.replaceAll("_", "-")}</td>
                      <td className="border-b px-3 py-2"><button onClick={() => window.alert("Invoice preview is available from Finance → Invoices") } className="rounded-lg border px-2 py-1 text-xs">View Invoice</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function MiniCard({ label, value }) { return <div className="rounded-xl border p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>; }
function Select({ label, value, onChange, options }) { return <label className="block"><div className="text-xs font-medium text-zinc-600">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }
function Input({ label, value, onChange, type = "text" }) { return <label className="block"><div className="text-xs font-medium text-zinc-600">{label}</div><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" /></label>; }
