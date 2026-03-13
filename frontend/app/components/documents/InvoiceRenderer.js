"use client";

import DocumentFooter from "./DocumentFooter";
import DocumentHeader from "./DocumentHeader";
import DocumentTable from "./DocumentTable";

export const FALLBACK_INVOICE_TEMPLATE = {
  layoutVariant: "standard",
  styleConfig: {
    headerAlignment: "left",
    showLogo: true,
    showCompanyAddress: true,
    showPhone: true,
    showEmail: true,
    primaryColor: "#10b981",
    accentColor: "#0f172a",
    tableStyle: "bordered",
  },
  headerConfig: { title: "Invoice", subtitle: "Sales Invoice", customText: "Thank you for your business" },
  footerConfig: { customText: "This is a system generated document.", showSignatureLine: true, showStampArea: true, showTerms: false },
};

export default function InvoiceRenderer({ documentData = {}, templateConfig, company = {}, settings = {} }) {
  const template = templateConfig || FALLBACK_INVOICE_TEMPLATE;

  return (
    <div>
      <DocumentHeader documentType="invoice" templateConfig={template} company={company} settings={settings} documentData={documentData} />
      <DocumentTable items={documentData.items || []} templateConfig={template} />

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-sm rounded-lg border p-3 text-sm">
          <div className="flex justify-between"><span>Total Amount</span><strong>PKR {Number(documentData?.totals?.totalAmount || 0).toLocaleString()}</strong></div>
        </div>
      </div>

      {documentData.notes ? <div className="mt-4 text-sm text-zinc-700"><strong>Notes:</strong> {documentData.notes}</div> : null}
      <DocumentFooter templateConfig={template} />
    </div>
  );
}
