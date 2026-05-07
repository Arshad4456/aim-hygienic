import Link from "next/link";
import { BRAND_CONFIG, getBrandInitials } from "@/src/config/brand";
import { publicNav } from "./marketingData";

export default function PublicSiteLayout({ children }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20">{getBrandInitials()}</span>
            <span><span className="block text-base font-black tracking-tight">{BRAND_CONFIG.name}</span><span className="block text-xs font-medium text-slate-400">{BRAND_CONFIG.tagline.split(".")[0]}</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-300 lg:flex">{publicNav.map((item) => <Link key={item.href} href={item.href} className="transition hover:text-white">{item.label}</Link>)}</nav>
          <div className="flex items-center gap-2"><Link href="/login" className="hidden rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex">Login</Link><Link href="/book-demo" className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-cyan-500/20">Book Demo</Link></div>
        </div>
      </header>
      {children}
      <footer className="border-t border-white/10 bg-slate-950 px-5 py-10 lg:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.4fr_1fr_1fr]"><div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">{getBrandInitials()}</span><p className="text-lg font-black">{BRAND_CONFIG.name}</p></div><p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">{BRAND_CONFIG.description}</p></div><div><p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Product</p><div className="mt-4 grid gap-3 text-sm text-slate-300">{publicNav.slice(0, 4).map((item) => <Link key={item.href} href={item.href} className="hover:text-white">{item.label}</Link>)}</div></div><div><p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Contact</p><div className="mt-4 grid gap-3 text-sm text-slate-300"><span>{BRAND_CONFIG.salesEmail}</span><span>{BRAND_CONFIG.whatsappNumber}</span><span>{BRAND_CONFIG.domain}</span></div></div></div></footer>
    </main>
  );
}
