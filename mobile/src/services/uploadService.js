import api from './api';

export async function uploadFileWithPresignedUrl({ fileName, mimeType, module, entityId, uri }) {
  const presignResponse = await api.post('/api/uploads/presign', {
    fileName,
    mimeType,
    module,
    entityId
  });

  const { uploadUrl, fileKey, publicUrl } = presignResponse.data;

  const fileBlob = await fetch(uri).then((res) => res.blob());

  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType
    },
    body: fileBlob
  });

  await api.post('/api/uploads/confirm', {
    module,
    entityId,
    fileKey,
    publicUrl
  });

  return publicUrl;
}