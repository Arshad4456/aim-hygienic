import { APP_CONFIG } from "../../../config/app";
export async function sendLocationUpdate(payload, token) {
  const response = await fetch(`${APP_CONFIG.apiBaseUrl}/live-tracking/location`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  return response.json();
}
