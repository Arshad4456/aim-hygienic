export default function ModuleCardStrip({ items = [], activeKey = "", onSelect }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-full gap-3 px-1">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect?.(item)}
              className={[
                "min-w-[220px] rounded-3xl border px-4 py-4 text-left shadow-sm transition",
                active ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-zinc-200 bg-white hover:bg-zinc-50",
              ].join(" ")}
            >
              <div className="text-sm font-semibold">{item.title}</div>
              {item.description ? <div className="mt-1 text-xs text-zinc-600">{item.description}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
