import apiClient, { uploadFileToPresignedUrl } from './client';

export async function getPresignedUpload(payload) {
  const { data } = await apiClient.post('/uploads/presign', payload);
  return data;
}

export async function confirmUpload(payload) {
  const { data } = await apiClient.post('/uploads/complete', payload);
  return data;
}

export async function uploadViaBackendPresigned({ presignPayload, fileBlob, contentType }) {
  const presigned = await getPresignedUpload(presignPayload);
  await uploadFileToPresignedUrl(presigned.uploadUrl, fileBlob, contentType);
  return presigned;
}

async function fileUriToBase64DataUrl(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadTransactionPodViaProxy({ transactionId, fileUri, contentType }) {
  const fileBase64 = await fileUriToBase64DataUrl(fileUri);
  const { data } = await apiClient.post('/uploads/transaction-pod-proxy', {
    transactionId,
    contentType,
    fileBase64,
  });
  return data;
}


export async function createDocumentUploadUrl(payload) {
  const { data } = await apiClient.post('/uploads/document-url', payload);
  return data;
}

export async function uploadDocumentViaApi({ fileBase64, fileName, contentType, type = 'company-document', entityType, entityId, metadata = {} }) {
  const { data } = await apiClient.post('/uploads/document', {
    fileBase64,
    fileName,
    contentType,
    type,
    entityType,
    entityId,
    metadata,
  });
  return data;
}

export const DOCUMENT_UPLOAD_TYPES = [
  'user-document',
  'company-document',
  'payment-proof',
  'proof-of-delivery',
  'invoice-attachment',
  'receipt-attachment',
  'vehicle-proof',
  'service-proof',
  'trading-document',
  'manufacturing-qc-proof',
];
