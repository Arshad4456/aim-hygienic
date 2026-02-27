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
