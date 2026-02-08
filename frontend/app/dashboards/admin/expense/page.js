"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const statusLabels = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
};

export default function ExpenseListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({ status: "all", paymentMode: "all", costCenter: "" });

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/expenses");
      setRows(data.expenses || []);
    } catch (e) {
      setErr(e.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filters.status !== "all" && row.status !== filters.status) return false;
      if (filters.paymentMode !== "all" && row.paymentMode !== filters.paymentMode) return false;
      if (filters.costCenter && !row.costCenter?.toLowerCase().includes(filters.costCenter.toLowerCase())) return false;
      return true;
    });
  }, [rows, filters]);

  async function updateStatus(row, nextStatus) {
    try {
      const data = await apiFetch(`/expenses/${row._id}`,
        {
          method: "PUT",
          body: {
            ...row,
            status: nextStatus,
            approvedBy: nextStatus === "approved" ? "System Admin" : row.approvedBy,
          },
        }
      );
      setRows((s) => s.map((item) => (item._id === row._id ? data.expense : item)));
    } catch (e) {
      alert(e.message || "Failed to update status");
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this expense record?")) return;
    try {
      await apiFetch(`/expenses/${id}`, { method: "DELETE" });
      setRows((s) => s.filter((item) => item._id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  function exportCsv() {
    const headers = [
      "Expense ID",
      "Title",
      "Category",
      "Cost Center",
      "Vendor",
      "Amount",
      "Currency",
      "Payment Mode",
      "Status",
      "Requested By",
      "Approved By",
      "Expense Date",
    ];
    const lines = filtered.map((row) => [
      row.expenseId,
      row.title,
      row.category,
      row.costCenter,
      row.vendorName,
      row.amount,
      row.currency,
      row.paymentMode,
      row.status,
      row.requestedBy,
      row.approvedBy,
      row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...lines]
      .map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-report-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell title="Expense Management" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Expense Management</div>
            <div className="text-sm text-zinc-500 mt-1">
              Review, approve, and export expense requests by cost center and payment mode.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
            >
              Export CSV
            </button>
            <a
              href="/dashboards/admin/expense/add"
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
            >
              + Add Expense
            </a>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => setFilters((s) => ({ ...s, status: value }))}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "paid", label: "Paid" },
            ]}
          />
          <FilterSelect
            label="Payment Mode"
            value={filters.paymentMode}
            onChange={(value) => setFilters((s) => ({ ...s, paymentMode: value }))}
            options={[
              { value: "all", label: "All payment modes" },
              { value: "cash", label: "Cash" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "card", label: "Card" },
              { value: "mobile_banking", label: "Mobile Banking" },
              { value: "cheque", label: "Cheque" },
            ]}
          />
          <div>
            <Label>Cost Center</Label>
            <input
              value={filters.costCenter}
              onChange={(e) => setFilters((s) => ({ ...s, costCenter: e.target.value }))}
              placeholder="Search cost center"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Expense ID</th>
                <th className="text-left px-3 py-2 border-b">Title</th>
                <th className="text-left px-3 py-2 border-b">Cost Center</th>
                <th className="text-left px-3 py-2 border-b">Payment</th>
                <th className="text-left px-3 py-2 border-b">Amount</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Requested By</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                    No expense records found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.expenseId}</td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900 font-medium">{row.title}</div>
                      <div className="text-xs text-zinc-500">{row.vendorName || "Vendor n/a"}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900">{row.costCenter || "-"}</div>
                      <div className="text-xs text-zinc-500">{row.category || "-"}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900">{row.paymentMode?.replace("_", " ") || "-"}</div>
                      <div className="text-xs text-zinc-500">{row.paymentReference || "Ref n/a"}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900 font-semibold">
                        {row.currency || "BDT"} {Number(row.amount || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : "Date n/a"}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900">{row.requestedBy || "-"}</div>
                      <div className="text-xs text-zinc-500">Approved by {row.approvedBy || "-"}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateStatus(row, "approved")}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(row, "rejected")}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-red-600"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => updateStatus(row, "paid")}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-emerald-600"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => onDelete(row._id)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusPill({ status }) {
  const label = statusLabels[status] || "Unknown";
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    paid: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${styles[status] || "bg-zinc-50 text-zinc-600 border-zinc-200"}`}>
      {label}
    </span>
  );
}
