"use client";

import { useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const initialForm = {
  expenseId: "",
  title: "",
  category: "",
  costCenter: "",
  vendorName: "",
  amount: "",
  currency: "BDT",
  paymentMode: "cash",
  paymentReference: "",
  expenseDate: "",
  status: "pending",
  requestedBy: "",
  approvedBy: "",
  notes: "",
};

export default function AddExpensePage() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await apiFetch("/expenses", {
        method: "POST",
        body: {
          ...form,
          amount: Number(form.amount || 0),
        },
      });
      setOk("✅ Expense submitted for approval.");
      setForm(initialForm);
    } catch (e2) {
      setErr(e2.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Expense" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">New Expense Request</div>
        <div className="text-sm text-zinc-500 mt-1">
          Capture expenses with cost center, approvals, and payment details.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}
        {ok ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {ok}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <SectionTitle title="Expense Details" />
          </div>
          <Field label="Expense ID" value={form.expenseId} onChange={(v) => setField("expenseId", v)} required />
          <Field label="Expense Title" value={form.title} onChange={(v) => setField("title", v)} required />
          <Field label="Category" value={form.category} onChange={(v) => setField("category", v)} />
          <Field label="Cost Center" value={form.costCenter} onChange={(v) => setField("costCenter", v)} />
          <Field label="Vendor / Payee" value={form.vendorName} onChange={(v) => setField("vendorName", v)} />
          <Field label="Amount" value={form.amount} onChange={(v) => setField("amount", v)} type="number" required />
          <Field label="Currency" value={form.currency} onChange={(v) => setField("currency", v)} />
          <div>
            <Label>Expense Date</Label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setField("expenseDate", e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="lg:col-span-2 mt-4">
            <SectionTitle title="Payment & Approvals" />
          </div>
          <SelectField
            label="Payment Mode"
            value={form.paymentMode}
            onChange={(v) => setField("paymentMode", v)}
            options={[
              { value: "cash", label: "Cash" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "card", label: "Card" },
              { value: "mobile_banking", label: "Mobile Banking" },
              { value: "cheque", label: "Cheque" },
            ]}
          />
          <Field
            label="Payment Reference"
            value={form.paymentReference}
            onChange={(v) => setField("paymentReference", v)}
          />
          <Field label="Requested By" value={form.requestedBy} onChange={(v) => setField("requestedBy", v)} />
          <SelectField
            label="Approval Status"
            value={form.status}
            onChange={(v) => setField("status", v)}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "paid", label: "Paid" },
            ]}
          />
          <Field label="Approved By" value={form.approvedBy} onChange={(v) => setField("approvedBy", v)} />

          <div className="lg:col-span-2">
            <Label>Notes</Label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>

          <div className="lg:col-span-2 flex items-center gap-3 mt-2">
            <button
              disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Submit Expense"}
            </button>
            <button
              type="button"
              onClick={() => setForm(initialForm)}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function SectionTitle({ title }) {
  return <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</div>;
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
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
