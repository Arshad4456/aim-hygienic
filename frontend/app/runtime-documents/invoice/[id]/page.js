"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InvoiceRenderer, { FALLBACK_INVOICE_TEMPLATE } from "../../../components/documents/InvoiceRenderer";
import DocumentPreviewShell from "../../../components/documents/DocumentPreviewShell";
import { fetchDefaultTemplate, fetchRuntimeInvoiceDocument } from "../../../lib/runtimeDocuments";
import { apiFetch } from "../../../lib/api";
import { getAuthItem } from "../../../lib/clientAuth";

export default function RuntimeInvoicePreviewPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documentData, setDocumentData] = useState(null);
  const [template, setTemplate] = useState(null);
  const [company, setCompany] = useState({});
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (!id) return;
    const token = getAuthItem("aim_token");
    if (!token) {
      setError("Unauthorized");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [doc, tpl, runtime] = await Promise.all([
          fetchRuntimeInvoiceDocument(id),
          fetchDefaultTemplate("invoice").catch(() => null),
          apiFetch("/runtime/dashboard").catch(() => null),
        ]);
        if (cancelled) return;
        setDocumentData(doc);
        setTemplate(tpl || FALLBACK_INVOICE_TEMPLATE);

        if (runtime?.dashboard?.company) {
          setCompany(runtime.dashboard.company);
          setSettings(runtime.dashboard.settings || {});
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load invoice preview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="p-6 text-sm">Loading invoice preview...</div>;
  if (error || !documentData) return <div className="p-6 text-sm text-rose-700">{error || "Invoice not found"}</div>;

  return (
    <DocumentPreviewShell title="Invoice Preview" templateConfig={template || FALLBACK_INVOICE_TEMPLATE}>
      <InvoiceRenderer documentData={documentData} templateConfig={template} company={company} settings={settings} />
    </DocumentPreviewShell>
  );
}