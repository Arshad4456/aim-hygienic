"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "../../components/AdminShell";
import PageHeader from "../../../../components/foundation/PageHeader";
import SectionCard from "../../../../components/foundation/SectionCard";
import { v2Api } from "../../../../lib/api";

const initialForm = {
  companyId: "",
  name: "",
  phone1: "",
  phone2: "",
  email: "",
  mainOfficeAddress: "",
};

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-zinc-800">{label}</div>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-emerald-300"
      />
    </label>
  );
}

export default function AddCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("neutral");

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = await v2Api.systemAdmin.createCompany(form);
      setTone("success");
      setMessage(`Company ${data?.company?.name || form.name} created successfully.`);
      const createdId = data?.company?._id;
      setForm(initialForm);
      if (createdId) {
        router.push(`/dashboards/admin/companies/${createdId}`);
      }
    } catch (error) {
      setTone("error");
      setMessage(error.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Add Company" user={null}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="System Admin"
          title="Create a new company"
          description="This will register the company in the platform, prepare its tenant identity, and make it ready for module access and role rollout."
        />

        {message ? (
          <div className={`rounded-3xl border px-4 py-3 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {message}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <SectionCard title="Company identity" description="The company ID and company name are the main platform identity fields.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company ID" value={form.companyId} onChange={(value) => setField("companyId", value)} required placeholder="0001" />
              <Field label="Company Name" value={form.name} onChange={(value) => setField("name", value)} required placeholder="Aim Hygienic" />
              <Field label="Primary Phone" value={form.phone1} onChange={(value) => setField("phone1", value)} placeholder="03xx-xxxxxxx" />
              <Field label="Secondary Phone" value={form.phone2} onChange={(value) => setField("phone2", value)} placeholder="Optional" />
              <div className="md:col-span-2">
                <Field label="Email" type="email" value={form.email} onChange={(value) => setField("email", value)} placeholder="company@example.com" />
              </div>
              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-zinc-800">Main Office Address</div>
                <textarea
                  rows={4}
                  value={form.mainOfficeAddress}
                  onChange={(event) => setField("mainOfficeAddress", event.target.value)}
                  placeholder="Enter main office location"
                  className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-emerald-300"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="What happens next" description="After creation, you can open company details to manage module access and onboarding quality.">
            <div className="space-y-4 text-sm text-zinc-600">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="font-semibold text-zinc-900">1. Tenant registration</div>
                <div className="mt-1">The backend creates the company record and prepares the tenant database identity.</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="font-semibold text-zinc-900">2. Company detail review</div>
                <div className="mt-1">Open the company detail page to inspect setup quality and feature/module posture.</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="font-semibold text-zinc-900">3. Module enable / disable</div>
                <div className="mt-1">Use company-level module access to control what each business role can see after onboarding.</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save company"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboards/admin/companies")}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Back to company list
              </button>
            </div>
          </SectionCard>
        </form>
      </div>
    </AdminShell>
  );
}
