import { apiFetch } from "./api";

function formatFields404(error) {
  if (/404/.test(String(error?.message || ""))) {
    return new Error("Fields API endpoint not found (404). Please deploy backend with /api/fields route.");
  }
  return error;
}

export async function listFieldsCompat(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        query.set(key, String(value));
      }
    });
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const data = await apiFetch(`/fields${suffix}`);
    return { fields: data.fields || [], pagination: data.pagination, legacy: false };
  } catch (error) {
    throw formatFields404(error);
  }
}

export async function createFieldCompat(payload) {
  try {
    return await apiFetch("/fields", { method: "POST", body: payload });
  } catch (error) {
    throw formatFields404(error);
  }
}

export async function updateFieldCompat(id, payload) {
  try {
    return await apiFetch(`/fields/${id}`, { method: "PUT", body: payload });
  } catch (error) {
    throw formatFields404(error);
  }
}

export async function deleteFieldCompat(id) {
  try {
    return await apiFetch(`/fields/${id}`, { method: "DELETE" });
  } catch (error) {
    throw formatFields404(error);
  }
}
