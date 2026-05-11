import Link from "next/link";
import { BRAND_CONFIG, getBrandInitials } from "@/src/app/config/brand";
import { publicNav, whatsappLink } from "../data/marketingData";

function HeaderActions({ compact = false }) {
  const buttonClass = compact
    ? "flex w-full justify-center rounded-2xl px-4 py-3 text-sm font-black"
    : "rounded-2xl px-4 py-2 text-sm font-black";
  return (
    <div className={compact ? "grid gap-2" : "flex items-center gap-2"}>
      <Link href="/login" className={`${buttonClass} border border-white/15 text-white transition hover:bg-white/10`}>
        Login
      </Link>
      <Link href="/book-demo" className={`${buttonClass} bg-white text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-cyan-500/20`}>
        Book Demo
      </Link>
    </div>
  );
}

export default function PublicSiteLayout({ children }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 sm:h-11 sm:w-11">
              {getBrandInitials()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-tight">{BRAND_CONFIG.name}</span>
              <span className="hidden truncate text-xs font-medium text-slate-400 sm:block">{BRAND_CONFIG.tagline}</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 lg:flex">
            {publicNav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <HeaderActions />
          </div>

          <details className="group relative lg:hidden">
            <summary className="list-none rounded-2xl border border-white/15 px-4 py-2 text-sm font-black text-white [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <div className="absolute right-0 mt-3 w-[min(92vw,340px)] rounded-[1.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/50">
              <div className="grid gap-2">
                {publicNav.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10 hover:text-white">
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="mt-3 border-t border-white/10 pt-3">
                <HeaderActions compact />
              </div>
            </div>
          </details>
        </div>
      </header>
      {children}
      <footer className="border-t border-white/10 bg-slate-950 px-5 py-10 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">{getBrandInitials()}</span>
              <p className="text-lg font-black">{BRAND_CONFIG.name}</p>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">{BRAND_CONFIG.description}</p>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Product</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              {publicNav.slice(0, 5).map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Contact</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <a href={`mailto:${BRAND_CONFIG.salesEmail}`} className="hover:text-white">{BRAND_CONFIG.salesEmail}</a>
              <a href={whatsappLink} className="hover:text-white">{BRAND_CONFIG.whatsappNumber}</a>
              <span>{BRAND_CONFIG.domain}</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
