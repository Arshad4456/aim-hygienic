"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../lib/api";
import DocumentPreviewShell from "../../components/documents/DocumentPreviewShell";
import InvoiceRenderer, { FALLBACK_INVOICE_TEMPLATE } from "../../components/documents/InvoiceRenderer";
import ReceiptRenderer, { FALLBACK_RECEIPT_TEMPLATE } from "../../components/documents/ReceiptRenderer";
import { fetchRuntimeInvoiceDocument, fetchRuntimeReceiptDocument } from "../../lib/runtimeDocuments";

const SAMPLE_INVOICE = {
  documentNo: "INV-SAMPLE-001",
  documentDate: new Date().toISOString(),
  customerName: "Sample Customer",
  status: "preview",
  items: [{ productName: "Soap", quantity: 10, unitPrice: 120, amount: 1200 }],
  totals: { totalAmount: 1200 },
  notes: "Sample invoice preview",
};

const SAMPLE_RECEIPT = {
  documentNo: "REC-SAMPLE-001",
  documentDate: new Date().toISOString(),
  customerName: "Sample Customer",
  status: "preview",
  paymentMethod: "cash",
  paidTo: "Cash Counter",
  linkedInvoiceNo: "INV-SAMPLE-001",
  referenceNo: "-",
  totals: { totalAmount: 1200 },
  notes: "Sample receipt preview",
};

export default function RuntimeDocumentTemplatePreviewPage() {
  const query = useSearchParams();
  const documentType = String(query.get("documentType") || "invoice").toLowerCase();
  const templateId = query.get("templateId");
  const sampleData = query.get("sampleData") === "true";
  const documentId = query.get("documentId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [company, setCompany] = useState({});
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [runtime, templatesRes] = await Promise.all([
          apiFetch("/runtime/dashboard"),
          apiFetch(`/runtime/document-templates?documentType=${documentType}`),
        ]);

        if (cancelled) return;

        setCompany(runtime?.dashboard?.company || {});
        setSettings(runtime?.dashboard?.settings || {});

        const templates = templatesRes?.templates || [];
        const selected = templates.find((item) => String(item._id) === String(templateId || ""));
        setTemplate(selected || (documentType === "receipt" ? FALLBACK_RECEIPT_TEMPLATE : FALLBACK_INVOICE_TEMPLATE));

        if (sampleData || !documentId) {
          setDocumentData(documentType === "receipt" ? SAMPLE_RECEIPT : SAMPLE_INVOICE);
        } else if (documentType === "receipt") {
          const doc = await fetchRuntimeReceiptDocument(documentId);
          if (!cancelled) setDocumentData(doc);
        } else {
          const doc = await fetchRuntimeInvoiceDocument(documentId);
          if (!cancelled) setDocumentData(doc);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load document template preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [documentType, templateId, sampleData, documentId]);

  const title = useMemo(() => `${documentType === "receipt" ? "Receipt" : "Invoice"} Template Preview`, [documentType]);

  if (loading) return <div className="p-6 text-sm">Loading preview...</div>;
  if (error || !documentData) return <div className="p-6 text-sm text-rose-700">{error || "Preview unavailable"}</div>;

  return (
    <DocumentPreviewShell title={title} templateConfig={template || {}}>
      {documentType === "receipt" ? (
        <ReceiptRenderer documentData={documentData} templateConfig={template} company={company} settings={settings} />
      ) : (
        <InvoiceRenderer documentData={documentData} templateConfig={template} company={company} settings={settings} />
      )}
    </DocumentPreviewShell>
  );
}
