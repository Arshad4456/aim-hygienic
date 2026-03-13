"use client";

export default function DocumentFooter({ templateConfig = {} }) {
  const footer = templateConfig.footerConfig || {};

  return (
    <div className="mt-6 border-t pt-4 text-sm text-zinc-700">
      <div>{footer.customText || "This is a system generated document."}</div>
      {footer.showTerms ? <div className="mt-2 text-xs text-zinc-600"><strong>Terms:</strong> {footer.termsText || "-"}</div> : null}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {footer.showSignatureLine ? <div className="border-t pt-1 text-xs text-zinc-500">Authorized Signature</div> : null}
        {footer.showStampArea ? <div className="border border-dashed rounded p-4 text-xs text-zinc-400 text-center">Stamp Area</div> : null}
      </div>
    </div>
  );
}
