"use client";
export default function PortalHeader({ title, subtitle, children }) {
  return <div className="mb-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Rawyan ERP</p><h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{title}</h2>{subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p> : null}</div>{children ? <div className="flex flex-wrap gap-2">{children}</div> : null}</div></div>;
}
