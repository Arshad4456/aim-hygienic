"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function AddCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

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

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setLoading(true);

    try {
      await apiFetch("/companies", {
        method: "POST",
        body: {
          companyId: form.companyId,
          name: form.name,
          phone1: form.phone1,
          phone2: form.phone2,
          email: form.email,
          mainOfficeAddress: form.mainOfficeAddress,
        },
      });

      setOk("✅ Company created successfully.");
      setTimeout(() => router.push("/dashboards/admin/companies"), 600);
    } catch (e2) {
      setErr(e2.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Add New Company" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add New Company</div>
        <div className="text-sm text-zinc-500 mt-1">
          Enter company details for registration.
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company ID" value={form.companyId} onChange={(v) => setField("companyId", v)} required />
          <Field label="Company Name" value={form.name} onChange={(v) => setField("name", v)} required />
          <Field label="Phone #1" value={form.phone1} onChange={(v) => setField("phone1", v)} />
          <Field label="Phone #2" value={form.phone2} onChange={(v) => setField("phone2", v)} />
          <Field label="Email" value={form.email} onChange={(v) => setField("email", v)} type="email" />

          <div className="md:col-span-2">
            <Label>Main Office Address</Label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              rows={3}
              value={form.mainOfficeAddress}
              onChange={(e) => setField("mainOfficeAddress", e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <button
              disabled={loading}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Company"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboards/admin/companies")}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
            >
              View Company List
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
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