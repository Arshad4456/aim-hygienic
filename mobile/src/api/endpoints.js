export const endpoints = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },
  dashboard: {
    summary: '/dashboard/summary',
  },
  runtime: {
    dashboard: '/runtime/dashboard',
    documentTemplatesDefault: '/runtime/document-templates/default',
    invoiceDocument: (id) => `/runtime/documents/invoice/${id}`,
    receiptDocument: (id) => `/runtime/documents/receipt/${id}`,
  },
  uploads: {
    presign: '/uploads/presign',
    complete: '/uploads/complete',
  },
};