"use client";
export default function PortalShell({ title = "Rawyan ERP", subtitle, children, sidebar, actions }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        {sidebar ? <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/90 lg:block">{sidebar}</aside> : null}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Rawyan ERP</p><h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}</div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
          </header>
          <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</section>
        </main>
      </div>
    </div>
  );
}
