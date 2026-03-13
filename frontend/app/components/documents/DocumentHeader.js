"use client";

export default function DocumentHeader({ templateConfig = {}, company = {}, settings = {}, documentType = "invoice", documentData = {} }) {
  const style = templateConfig.styleConfig || {};
  const header = templateConfig.headerConfig || {};
  const align = style.headerAlignment || "left";
  const title = header.title || (documentType === "receipt" ? "Receipt" : "Invoice");

  return (
    <div className="border-b pb-4" style={{ textAlign: align }}>
      <div className="flex items-start justify-between gap-4" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <div>
          <div className="text-2xl font-bold" style={{ color: style.accentColor || "#0f172a" }}>{title}</div>
          {header.subtitle ? <div className="text-sm text-zinc-500">{header.subtitle}</div> : null}
          {header.customText ? <div className="mt-1 text-xs text-zinc-600">{header.customText}</div> : null}
        </div>

        <div className="text-sm">
          {style.showLogo !== false && company.logoUrl ? <img src={company.logoUrl} alt="Company logo" className="h-14 w-14 rounded object-cover ml-auto" /> : null}
          <div className="font-semibold">{settings.appName || company.name || "AIM Hygienic ERP"}</div>
          {style.showCompanyAddress !== false ? <div className="text-zinc-600">{company.address || ""}</div> : null}
          {style.showPhone !== false ? <div className="text-zinc-600">{company.phone || ""}</div> : null}
          {style.showEmail !== false ? <div className="text-zinc-600">{company.email || ""}</div> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div><span className="text-zinc-500">Document #:</span> <span className="font-medium">{documentData.documentNo || "-"}</span></div>
        <div><span className="text-zinc-500">Date:</span> <span className="font-medium">{documentData.documentDate ? new Date(documentData.documentDate).toLocaleDateString() : "-"}</span></div>
        <div><span className="text-zinc-500">Customer:</span> <span className="font-medium">{documentData.customerName || "-"}</span></div>
        <div><span className="text-zinc-500">Status:</span> <span className="font-medium">{documentData.status || "-"}</span></div>
      </div>
    </div>
  );
}