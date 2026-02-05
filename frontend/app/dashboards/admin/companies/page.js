"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function CompanyListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editId, setEditId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/companies");
    setRows(data?.companies || []);
    } catch (e) {
      setErr(e.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onDelete(id) {
    if (!confirm("Delete this company?")) return;
    try {
      await apiFetch(`/companies/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  return (
    <AdminShell title="Company List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Companies</div>
            <div className="text-sm text-zinc-500 mt-1">Manage companies (edit/delete).</div>
          </div>
          <a
            href="/dashboards/admin/companies/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Company
          </a>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Company ID</th>
                <th className="text-left px-3 py-2 border-b">Company Name</th>
                <th className="text-left px-3 py-2 border-b">Phone #1</th>
                <th className="text-left px-3 py-2 border-b">Email</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No companies found</td></tr>
              ) : (
                rows.map((c) => (
                  <tr key={c._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{c.companyId}</td>
                    <td className="px-3 py-2 border-b">{c.name}</td>
                    <td className="px-3 py-2 border-b">{c.phone1 || "-"}</td>
                    <td className="px-3 py-2 border-b">{c.email || "-"}</td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditId(c._id); setEditOpen(true); }}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(c._id)}
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

      {editOpen ? (
        <EditCompanyModal
          id={editId}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); }}
        />
      ) : null}
    </AdminShell>
  );
}

function EditCompanyModal({ id, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    companyId: "",
    name: "",
    phone1: "",
    phone2: "",
    email: "",
    mainOfficeAddress: "",
  });

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/companies/${id}`);
        setForm({
          companyId: data.company?.companyId || "",
          name: data.company?.name || "",
          phone1: data.company?.phone1 || "",
          phone2: data.company?.phone2 || "",
          email: data.company?.email || "",
          mainOfficeAddress: data.company?.mainOfficeAddress || "",
        });
      } catch (e) {
        setErr(e.message || "Failed to load company");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onUpdate() {
    setErr("");
    setSaving(true);
    try {
      await apiFetch(`/companies/${id}`, {
        method: "PUT",
        body: form,
      });
      onSaved();
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Company</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>

        {/* SCROLLABLE CARD BODY */}
        <div className="flex-1 overflow-y-auto p-4">
          {err ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
          {loading ? (
            <div className="text-sm text-zinc-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Company ID" value={form.companyId} onChange={(v) => setField("companyId", v)} />
              <Field label="Company Name" value={form.name} onChange={(v) => setField("name", v)} />
              <Field label="Phone #1" value={form.phone1} onChange={(v) => setField("phone1", v)} />
              <Field label="Phone #2" value={form.phone2} onChange={(v) => setField("phone2", v)} />
              <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} />

              <div className="md:col-span-2">
                <Label>Main Office Address</Label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                  rows={3}
                  value={form.mainOfficeAddress}
                  onChange={(e) => setField("mainOfficeAddress", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            disabled={saving || loading}
            onClick={onUpdate}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update"}
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}
function Field({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}