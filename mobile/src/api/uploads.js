import { apiClient } from './client';

export function presignUpload(payload) {
  return apiClient('/uploads/presign', { method: 'POST', body: payload });
}

export async function putToPresignedUrl(uploadUrl, file, contentType = 'application/octet-stream') {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}
