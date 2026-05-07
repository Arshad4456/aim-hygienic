const env = (key, fallback = "") => {
  const value = process.env?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

export const BRAND_CONFIG = {
  name: env("NEXT_PUBLIC_APP_NAME", "Enterprise ERP Suite"),
  shortName: env("NEXT_PUBLIC_APP_SHORT_NAME", "ERP Suite"),
  legalName: env("NEXT_PUBLIC_COMPANY_LEGAL_NAME", "Your Company Name"),
  previousName: env("NEXT_PUBLIC_PREVIOUS_APP_NAME", ""),
  tagline: env("NEXT_PUBLIC_APP_TAGLINE", "Modular SaaS ERP for distribution, manufacturing, retail POS, service, trading, finance, inventory, and field teams."),
  description: env("NEXT_PUBLIC_APP_DESCRIPTION", "A configurable multi-industry ERP platform with web portal, mobile app, role permissions, documents, proofs, invoices, receipts, reports, and cloud-ready SaaS controls."),
  domain: env("NEXT_PUBLIC_APP_DOMAIN", "yourdomain.com"),
  websiteUrl: env("NEXT_PUBLIC_WEBSITE_URL", ""),
  supportEmail: env("NEXT_PUBLIC_SUPPORT_EMAIL", "support@yourdomain.com"),
  salesEmail: env("NEXT_PUBLIC_SALES_EMAIL", "sales@yourdomain.com"),
  whatsappNumber: env("NEXT_PUBLIC_WHATSAPP_NUMBER", "+92 300 0000000"),
  currency: env("NEXT_PUBLIC_DEFAULT_CURRENCY", "PKR"),
  logoText: env("NEXT_PUBLIC_LOGO_TEXT", "ERP"),
  primary: env("NEXT_PUBLIC_BRAND_PRIMARY", "#059669"),
  secondary: env("NEXT_PUBLIC_BRAND_SECONDARY", "#0891b2"),
  accent: env("NEXT_PUBLIC_BRAND_ACCENT", "#2563eb"),
  dark: env("NEXT_PUBLIC_BRAND_DARK", "#0f172a"),
  surface: env("NEXT_PUBLIC_BRAND_SURFACE", "#f8fafc"),
  gradient: env("NEXT_PUBLIC_BRAND_GRADIENT", "from-emerald-600 via-cyan-600 to-blue-700"),
};

export function getBrandInitials(name = BRAND_CONFIG.shortName) {
  const words = String(name || "ERP").replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "ERP";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

export const RAWYAN_BRAND = { ...BRAND_CONFIG, initials: getBrandInitials() };
export default BRAND_CONFIG;
