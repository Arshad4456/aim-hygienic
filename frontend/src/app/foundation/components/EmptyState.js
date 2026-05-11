export default function EmptyState({ title = "No data found", description = "Nothing is available for this section yet.", action = null }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl">📄</div>
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
