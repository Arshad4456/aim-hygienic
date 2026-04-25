export default function DynamicPortalHome({ user, menu = [] }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/75">Welcome to Rawyan ERP</p>
        <h2 className="mt-2 text-4xl font-black">{user?.fullName || user?.username || "ERP User"}</h2>
        <p className="mt-2 max-w-2xl text-white/80">Your portal is now generated from role permissions and ERP type access.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {menu.slice(0, 8).map((item) => (
          <a key={item.key} href={item.path} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{item.category}</p>
            <h3 className="mt-2 text-lg font-black text-slate-950">{item.name}</h3>
            <p className="mt-1 text-sm text-slate-500">Open module</p>
          </a>
        ))}
      </div>
    </div>
  );
}
