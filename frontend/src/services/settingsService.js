import { apiGet, apiPatch, apiPost, apiPut, withQuery } from "./apiClient";

export async function fetchSettings(params = {}) {
  return apiGet(withQuery("/settings", params));
}

export async function saveSettings(payload = {}, params = {}) {
  return apiPut(withQuery("/settings", params), payload);
}

export async function saveSettingsSection(section, payload = {}, params = {}) {
  return apiPatch(withQuery(`/settings/${section}`, params), payload);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadSettingsAsset(file, { companyId = "system", slot = "logo", entityType = "company-document" } = {}) {
  if (!file) throw new Error("Please choose a file first");
  const fileBase64 = await readFileAsDataUrl(file);
  return apiPost("/uploads/document", {
    entityType,
    entityId: companyId || "system",
    slot,
    contentType: file.type || "application/octet-stream",
    fileName: file.name || slot,
    fileBase64,
  });
}

export default { fetchSettings, saveSettings, saveSettingsSection, uploadSettingsAsset };
