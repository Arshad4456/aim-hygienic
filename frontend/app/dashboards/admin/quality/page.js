"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Raw Material QC",
    description: "Inspect incoming raw materials before receiving.",
    href: "/dashboards/admin/quality/raw-material",
  },
  {
    title: "Production QC",
    description: "Monitor quality checks during production stages.",
    href: "/dashboards/admin/quality/production",
  },
  {
    title: "Finished Goods QC",
    description: "Validate finished goods before warehousing.",
    href: "/dashboards/admin/quality/finished-goods",
  },
  {
    title: "Final Release QC",
    description: "Authorize final release for dispatch and sales.",
    href: "/dashboards/admin/quality/final-release",
  },
];

export default function QualityModulePage() {
  return (
    <AdminShell title="Quality & Compliance" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Quality & Compliance</div>
        <div className="text-sm text-zinc-500 mt-1">
          QC checkpoints to ensure material and product compliance.
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow"
            >
              <div className="text-sm font-semibold text-zinc-900">{card.title}</div>
              <div className="text-xs text-zinc-500 mt-2">{card.description}</div>
            </a>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}