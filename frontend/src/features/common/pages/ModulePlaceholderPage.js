export default function ModulePlaceholderPage({ module }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Module Foundation</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">{module?.name || "ERP Module"}</h2>
      <p className="mt-3 max-w-2xl text-slate-500">This route is connected to the Step 3 permission portal engine. In the next migration, move the old screen logic from role folders into this feature module.</p>
    </div>
  );
}
