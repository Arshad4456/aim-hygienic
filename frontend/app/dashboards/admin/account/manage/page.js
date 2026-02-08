"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const initialForm = {
  accountId: "",
  accountName: "",
  accountType: "bank",
  bankName: "",
  branch: "",
  accountNumber: "",
  currency: "BDT",
  openingBalance: "",
  currentBalance: "",
  swiftCode: "",
  iban: "",
  managerName: "",
  contactEmail: "",
  contactPhone: "",
  status: "active",
};

export default function AccountManagementPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [filter, setFilter] = useState("all");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/accounts");
      setRows(data.accounts || []);
    } catch (e) {
      setErr(e.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.status === filter);
  }, [rows, filter]);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await apiFetch("/accounts", {
        method: "POST",
        body: {
          ...form,
          openingBalance: Number(form.openingBalance || 0),
          currentBalance: Number(form.currentBalance || form.openingBalance || 0),
        },
      });
      setOk("✅ Account saved successfully.");
      setForm(initialForm);
      await load();
    } catch (e2) {
      setErr(e2.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditId(row._id);
    setEditForm({
      ...row,
      openingBalance: row.openingBalance ?? "",
      currentBalance: row.currentBalance ?? "",
    });
  }

  async function onSaveEdit() {
    try {
      const payload = {
        ...editForm,
        openingBalance: Number(editForm.openingBalance || 0),
        currentBalance: Number(editForm.currentBalance || editForm.openingBalance || 0),
      };
      const data = await apiFetch(`/accounts/${editId}`, { method: "PUT", body: payload });
      setRows((s) => s.map((item) => (item._id === editId ? data.account : item)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this account?")) return;
    try {
      await apiFetch(`/accounts/${id}`, { method: "DELETE" });
      setRows((s) => s.filter((item) => item._id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  return (
    <AdminShell title="Account Management" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Account Management</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track company cash, bank, and wallet accounts with balance visibility and status control.
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
            <SectionTitle title="Register New Account" />
          </div>
          <Field label="Account ID" value={form.accountId} onChange={(v) => setField("accountId", v)} required />
          <Field label="Account Name" value={form.accountName} onChange={(v) => setField("accountName", v)} required />
          <SelectField
            label="Account Type"
            value={form.accountType}
            onChange={(v) => setField("accountType", v)}
            options={[
              { value: "bank", label: "Bank" },
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "mobile", label: "Mobile" },
              { value: "wallet", label: "Wallet" },
            ]}
          />
          <Field label="Bank Name" value={form.bankName} onChange={(v) => setField("bankName", v)} />
          <Field label="Branch" value={form.branch} onChange={(v) => setField("branch", v)} />
          <Field label="Account Number" value={form.accountNumber} onChange={(v) => setField("accountNumber", v)} />
          <Field label="Currency" value={form.currency} onChange={(v) => setField("currency", v)} />
          <Field
            label="Opening Balance"
            value={form.openingBalance}
            onChange={(v) => setField("openingBalance", v)}
            type="number"
          />
          <Field
            label="Current Balance"
            value={form.currentBalance}
            onChange={(v) => setField("currentBalance", v)}
            type="number"
          />
          <Field label="SWIFT Code" value={form.swiftCode} onChange={(v) => setField("swiftCode", v)} />
          <Field label="IBAN" value={form.iban} onChange={(v) => setField("iban", v)} />
          <Field label="Account Manager" value={form.managerName} onChange={(v) => setField("managerName", v)} />
          <Field label="Contact Email" value={form.contactEmail} onChange={(v) => setField("contactEmail", v)} type="email" />
          <Field label="Contact Phone" value={form.contactPhone} onChange={(v) => setField("contactPhone", v)} />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => setField("status", v)}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />

          <div className="lg:col-span-2 flex items-center gap-3 mt-2">
            <button
              disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Account"}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-zinc-900">Account Directory</div>
            <div className="text-sm text-zinc-500">Monitor balances and status at a glance.</div>
          </div>
          <div className="flex items-center gap-2">
            <Label>Status</Label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Account</th>
                <th className="text-left px-3 py-2 border-b">Type</th>
                <th className="text-left px-3 py-2 border-b">Bank Details</th>
                <th className="text-left px-3 py-2 border-b">Balances</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    No accounts found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">
                      <div className="font-semibold text-zinc-900">{row.accountName}</div>
                      <div className="text-xs text-zinc-500">{row.accountId}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="capitalize text-zinc-900">{row.accountType}</div>
                      <div className="text-xs text-zinc-500">{row.currency}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900">{row.bankName || "-"}</div>
                      <div className="text-xs text-zinc-500">{row.accountNumber || "-"}</div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="text-zinc-900 font-semibold">
                        {row.currency || "BDT"} {Number(row.currentBalance || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Opening {Number(row.openingBalance || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                        >
                          Edit
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

      {editId ? (
        <EditDrawer form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSaveEdit} />
      ) : null}
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
        value={value ?? ""}
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

function StatusPill({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${styles[status] || styles.inactive}`}>
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

function EditDrawer({ form, onChange, onClose, onSave }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Account</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Account ID" value={form.accountId} onChange={(v) => onChange((s) => ({ ...s, accountId: v }))} />
          <Field label="Account Name" value={form.accountName} onChange={(v) => onChange((s) => ({ ...s, accountName: v }))} />
          <SelectField
            label="Account Type"
            value={form.accountType}
            onChange={(v) => onChange((s) => ({ ...s, accountType: v }))}
            options={[
              { value: "bank", label: "Bank" },
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "mobile", label: "Mobile" },
              { value: "wallet", label: "Wallet" },
            ]}
          />
          <Field label="Bank Name" value={form.bankName} onChange={(v) => onChange((s) => ({ ...s, bankName: v }))} />
          <Field label="Branch" value={form.branch} onChange={(v) => onChange((s) => ({ ...s, branch: v }))} />
          <Field
            label="Account Number"
            value={form.accountNumber}
            onChange={(v) => onChange((s) => ({ ...s, accountNumber: v }))}
          />
          <Field label="Currency" value={form.currency} onChange={(v) => onChange((s) => ({ ...s, currency: v }))} />
          <Field
            label="Opening Balance"
            value={form.openingBalance}
            onChange={(v) => onChange((s) => ({ ...s, openingBalance: v }))}
            type="number"
          />
          <Field
            label="Current Balance"
            value={form.currentBalance}
            onChange={(v) => onChange((s) => ({ ...s, currentBalance: v }))}
            type="number"
          />
          <Field label="SWIFT Code" value={form.swiftCode} onChange={(v) => onChange((s) => ({ ...s, swiftCode: v }))} />
          <Field label="IBAN" value={form.iban} onChange={(v) => onChange((s) => ({ ...s, iban: v }))} />
          <Field label="Manager" value={form.managerName} onChange={(v) => onChange((s) => ({ ...s, managerName: v }))} />
          <Field
            label="Contact Email"
            value={form.contactEmail}
            onChange={(v) => onChange((s) => ({ ...s, contactEmail: v }))}
          />
          <Field
            label="Contact Phone"
            value={form.contactPhone}
            onChange={(v) => onChange((s) => ({ ...s, contactPhone: v }))}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => onChange((s) => ({ ...s, status: v }))}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            onClick={onSave}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            Update
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}