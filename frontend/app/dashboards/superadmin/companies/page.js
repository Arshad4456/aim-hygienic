"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { apiFetch('/platform-admin/companies').then((d)=>setCompanies(d.companies||[])).catch((e)=>setError(e.message||'Failed to load companies')); }, []);
  return <div className="min-h-screen bg-zinc-50 p-6"><div className="max-w-6xl mx-auto"><div className="flex items-center justify-between mb-4"><h1 className="text-2xl font-bold">Companies</h1><Link className="rounded bg-emerald-600 text-white px-4 py-2" href="/platform-admin/companies">Open Platform Company Manager</Link></div>{error ? <div className="text-red-600 text-sm">{error}</div> : null}<div className="grid gap-3">{companies.map((c)=><Link key={c._id} href={`/platform-admin/companies/${c._id}/onboarding`} className="rounded-xl border bg-white p-4 hover:border-emerald-300"><div className="font-semibold">{c.name}</div><div className="text-sm text-zinc-500 mt-1">{c.slug} • {c.status}</div></Link>)}</div></div></div>;
}
