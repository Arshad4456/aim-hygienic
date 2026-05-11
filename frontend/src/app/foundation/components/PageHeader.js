export default function PageHeader({ eyebrow = "", title, description = "", actions = null }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          {eyebrow ? <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</div> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
          {description ? <p className="max-w-3xl text-sm leading-6 text-zinc-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
