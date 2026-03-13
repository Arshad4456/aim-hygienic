import { apiFetch } from "./api";

export async function fetchDefaultTemplate(documentType) {
  const data = await apiFetch(`/runtime/document-templates/default/${documentType}`);
  return data.template || null;
}

export async function fetchRuntimeInvoiceDocument(id) {
  const data = await apiFetch(`/runtime/documents/invoice/${id}`);
  return data.document || null;
}

export async function fetchRuntimeReceiptDocument(id) {
  const data = await apiFetch(`/runtime/documents/receipt/${id}`);
  return data.document || null;
}

export async function fetchCompanyById(companyId) {
  if (!companyId) return null;
  try {
    const data = await apiFetch(`/companies/${companyId}`);
    return data.company || null;
  } catch {
    return null;
  }
}