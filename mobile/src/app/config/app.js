export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || "Rawyan ERP",
  shortName: process.env.EXPO_PUBLIC_APP_SHORT_NAME || "Rawyan",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api",
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "mdarshadkhan344@gmail.com",
  whatsappNumber: process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || "+923339933057",
  phoneNumber: process.env.EXPO_PUBLIC_PHONE_NUMBER || "+923339933057",
};
export function getAppInitials(name = APP_CONFIG.shortName) {
  const words = String(name || 'ERP').replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return 'ERP';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}
export default APP_CONFIG;
