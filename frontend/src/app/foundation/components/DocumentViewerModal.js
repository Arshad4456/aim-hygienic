"use client";

export default function DocumentViewerModal({ open = false, title = "Document", documentUrl = "", onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-500">Preview generated V2 document, invoice, receipt, or POD file.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">
            Close
          </button>
        </div>
        <div className="flex-1 bg-zinc-50">
          {documentUrl ? (
            <iframe src={documentUrl} title={title} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">No document selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
