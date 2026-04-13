export default function SectionCard({ title, description = "", children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || description) ? (
        <div className="mb-4 space-y-1">
          {title ? <h2 className="text-base font-semibold text-zinc-900">{title}</h2> : null}
          {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
