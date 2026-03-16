"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function Page() {
  const [templates, setTemplates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [t, c] = await Promise.all([apiFetch('/platform-admin/setup-templates'), apiFetch('/platform-admin/companies')]);
    setTemplates(t.templates || []);
    const list = c.companies || [];
    setCompanies(list);
    if (list[0]?._id) setSelectedCompany(list[0]._id);
  }
  useEffect(() => { load().catch((e) => setError(e.message || 'Failed to load setup templates')); }, []);

  async function save(e) {
    e.preventDefault();
    if (!selectedCompany) return;
    try { await apiFetch(`/platform-admin/companies/${selectedCompany}/save-as-template`, { method: 'POST', body: { name, code, description: `${name} reusable setup`, category: 'general' } }); setName(''); setCode(''); await load(); } catch (e2) { setError(e2.message || 'Failed to save setup template'); }
  }

  return <div className="min-h-screen bg-zinc-50 p-6 md:p-8"><div className="max-w-6xl mx-auto space-y-6"><div className="rounded-2xl border bg-white p-6"><div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div><h1 className="text-2xl font-bold text-zinc-900 mt-2">Setup Templates</h1><p className="text-zinc-600 mt-2">Browse and reuse company setup templates for faster onboarding.</p></div>{error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}<form onSubmit={save} className="rounded-2xl border bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-4"><select className="rounded-xl border px-3 py-2" value={selectedCompany} onChange={(e)=>setSelectedCompany(e.target.value)}>{companies.map((company)=><option key={company._id} value={company._id}>{company.name}</option>)}</select><input className="rounded-xl border px-3 py-2" placeholder="Template name" value={name} onChange={(e)=>setName(e.target.value)} /><input className="rounded-xl border px-3 py-2" placeholder="code" value={code} onChange={(e)=>setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]+/g,'-'))} /><div className="md:col-span-3 flex justify-end"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold">Save Current Company As Template</button></div></form><div className="grid gap-4">{templates.map((tpl)=><div key={tpl._id} className="rounded-2xl border bg-white p-5"><div className="font-semibold">{tpl.name}</div><div className="text-sm text-zinc-500 mt-1">{tpl.code} · {tpl.category}</div></div>)}</div></div></div>;
}
