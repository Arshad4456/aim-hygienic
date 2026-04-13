export default function StatusBadge({ value = "", tone = "default", className = "" }) {
  const normalized = String(tone || value || "default").toLowerCase();
  const toneClass = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    posted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    partial: "bg-amber-50 text-amber-700 ring-amber-200",
    unpaid: "bg-rose-50 text-rose-700 ring-rose-200",
    rejected: "bg-rose-50 text-rose-700 ring-rose-200",
    draft: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
  }[normalized] || "bg-zinc-100 text-zinc-700 ring-zinc-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClass} ${className}`}>
      {value || "Unknown"}
    </span>
  );
}
