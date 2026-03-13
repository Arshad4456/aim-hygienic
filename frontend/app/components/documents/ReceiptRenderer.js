"use client";

import DocumentFooter from "./DocumentFooter";
import DocumentHeader from "./DocumentHeader";

export const FALLBACK_RECEIPT_TEMPLATE = {
  layoutVariant: "standard",
  styleConfig: {
    headerAlignment: "left",
    showLogo: true,
    showCompanyAddress: true,
    showPhone: true,
    showEmail: true,
    primaryColor: "#14b8a6",
    accentColor: "#0f172a",
    tableStyle: "minimal",
  },
  headerConfig: { title: "Receipt", subtitle: "Payment Receipt", customText: "Received with thanks" },
  footerConfig: { customText: "This is a system generated receipt.", showSignatureLine: true, showStampArea: true, showTerms: false },
};

export default function ReceiptRenderer({ documentData = {}, templateConfig, company = {}, settings = {} }) {
  const template = templateConfig || FALLBACK_RECEIPT_TEMPLATE;

  const entries = [
    ["Receipt No", documentData.documentNo],
    ["Payer", documentData.customerName],
    ["Payment Method", documentData.paymentMethod],
    ["Paid To", documentData.paidTo],
    ["Linked Invoice", documentData.linkedInvoiceNo],
    ["Reference", documentData.referenceNo],
    ["Amount", `PKR ${Number(documentData?.totals?.totalAmount || 0).toLocaleString()}`],
  ];

  return (
    <div>
      <DocumentHeader documentType="receipt" templateConfig={template} company={company} settings={settings} documentData={documentData} />
      <div className="mt-4 rounded-xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {entries.map(([k, v]) => <div key={k}><span className="text-zinc-500">{k}:</span> <span className="font-medium">{v || "-"}</span></div>)}
        </div>
      </div>
      {documentData.notes ? <div className="mt-4 text-sm text-zinc-700"><strong>Notes:</strong> {documentData.notes}</div> : null}
      <DocumentFooter templateConfig={template} />
    </div>
  );
}
