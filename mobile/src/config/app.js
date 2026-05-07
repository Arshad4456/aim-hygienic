export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || "Enterprise ERP Suite",
  shortName: process.env.EXPO_PUBLIC_APP_SHORT_NAME || "ERP Suite",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api",
  whatsappNumber: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || "+92 300 0000000",
};
export function getAppInitials(name = APP_CONFIG.shortName) {
  const words = String(name || 'ERP').replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return 'ERP';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}
export default APP_CONFIG;
