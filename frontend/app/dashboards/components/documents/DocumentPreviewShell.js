"use client";

export default function DocumentPreviewShell({ title, children, templateConfig = {} }) {
  const style = templateConfig.styleConfig || {};

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border bg-white shadow-sm" style={{ borderColor: style.primaryColor || "#e4e4e7" }}>
        <div className="border-b px-6 py-4" style={{ backgroundColor: `${style.primaryColor || "#10b981"}10` }}>
          <h1 className="text-lg font-semibold" style={{ color: style.accentColor || "#0f172a" }}>{title}</h1>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}