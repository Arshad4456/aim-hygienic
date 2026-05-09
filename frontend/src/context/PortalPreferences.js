"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
];

export const THEME_OPTIONS = [
  { code: "light", label: "Light" },
  { code: "dark", label: "Dark" },
  { code: "system", label: "System" },
];

const RTL_LANGS = new Set(LANGUAGE_OPTIONS.filter((item) => item.dir === "rtl").map((item) => item.code));

const DICTIONARY = {
  ur: {
    "Rawyan ERP": "راویان ای آر پی",
    "ERP Portal": "ای آر پی پورٹل",
    "Account": "اکاؤنٹ",
    "Account card": "اکاؤنٹ کارڈ",
    "Profile Settings": "پروفائل سیٹنگز",
    "Change Password": "پاس ورڈ تبدیل کریں",
    "Language / Theme": "زبان / تھیم",
    "Language": "زبان",
    "Theme": "تھیم",
    "Logout": "لاگ آؤٹ",
    "Full name": "پورا نام",
    "Email": "ای میل",
    "Mobile": "موبائل",
    "Save Profile": "پروفائل محفوظ کریں",
    "Current password": "موجودہ پاس ورڈ",
    "New password": "نیا پاس ورڈ",
    "Confirm password": "پاس ورڈ کی تصدیق",
    "Update Password": "پاس ورڈ اپڈیٹ کریں",
    "Preferences saved.": "ترجیحات محفوظ ہو گئیں۔",
    "Profile updated.": "پروفائل اپڈیٹ ہو گیا۔",
    "Password changed successfully.": "پاس ورڈ کامیابی سے تبدیل ہو گیا۔",
    "Dashboard": "ڈیش بورڈ",
    "System Admin": "سسٹم ایڈمن",
    "Client Companies": "کلائنٹ کمپنیاں",
    "System Users": "سسٹم یوزرز",
    "Subscription Plans": "سبسکرپشن پلانز",
    "Module Controls": "ماڈیول کنٹرولز",
    "Setup": "سیٹ اپ",
    "Master Data": "ماسٹر ڈیٹا",
    "Sales": "سیلز",
    "Purchase": "پرچیز",
    "Inventory": "انوینٹری",
    "Finance": "فنانس",
    "Reports": "رپورٹس",
    "Settings": "سیٹنگز",
    "Users": "یوزرز",
    "Roles & Permissions": "رولز اور پرمیشنز",
    "Products": "پروڈکٹس",
    "Customers": "کسٹمرز",
    "Suppliers": "سپلائرز",
    "Warehouses": "ویئر ہاؤسز",
    "Retail POS": "ریٹیل پی او ایس",
    "Manufacturing": "مینوفیکچرنگ",
    "Service ERP": "سروس ای آر پی",
    "Trading/Import": "ٹریڈنگ / امپورٹ",
    "Company Workspace": "کمپنی ورک اسپیس",
    "System Portal": "سسٹم پورٹل",
    "Company Admin": "کمپنی ایڈمن",
    "ERP User": "ای آر پی یوزر",
    "Light": "لائٹ",
    "Dark": "ڈارک",
    "System": "سسٹم",
    "English": "انگریزی",
    "Urdu": "اردو",
    "Arabic": "عربی",
  },
  ar: {
    "Rawyan ERP": "راويان ERP",
    "ERP Portal": "بوابة ERP",
    "Account": "الحساب",
    "Account card": "بطاقة الحساب",
    "Profile Settings": "إعدادات الملف الشخصي",
    "Change Password": "تغيير كلمة المرور",
    "Language / Theme": "اللغة / المظهر",
    "Language": "اللغة",
    "Theme": "المظهر",
    "Logout": "تسجيل الخروج",
    "Full name": "الاسم الكامل",
    "Email": "البريد الإلكتروني",
    "Mobile": "الجوال",
    "Save Profile": "حفظ الملف الشخصي",
    "Current password": "كلمة المرور الحالية",
    "New password": "كلمة المرور الجديدة",
    "Confirm password": "تأكيد كلمة المرور",
    "Update Password": "تحديث كلمة المرور",
    "Preferences saved.": "تم حفظ التفضيلات.",
    "Profile updated.": "تم تحديث الملف الشخصي.",
    "Password changed successfully.": "تم تغيير كلمة المرور بنجاح.",
    "Dashboard": "لوحة التحكم",
    "System Admin": "مسؤول النظام",
    "Client Companies": "شركات العملاء",
    "System Users": "مستخدمو النظام",
    "Subscription Plans": "خطط الاشتراك",
    "Module Controls": "إدارة الوحدات",
    "Setup": "الإعداد",
    "Master Data": "البيانات الأساسية",
    "Sales": "المبيعات",
    "Purchase": "المشتريات",
    "Inventory": "المخزون",
    "Finance": "المالية",
    "Reports": "التقارير",
    "Settings": "الإعدادات",
    "Users": "المستخدمون",
    "Roles & Permissions": "الأدوار والصلاحيات",
    "Products": "المنتجات",
    "Customers": "العملاء",
    "Suppliers": "الموردون",
    "Warehouses": "المستودعات",
    "Retail POS": "نقاط البيع",
    "Manufacturing": "التصنيع",
    "Service ERP": "إدارة الخدمات",
    "Trading/Import": "التجارة / الاستيراد",
    "Company Workspace": "مساحة الشركة",
    "System Portal": "بوابة النظام",
    "Company Admin": "مسؤول الشركة",
    "ERP User": "مستخدم ERP",
    "Light": "فاتح",
    "Dark": "داكن",
    "System": "النظام",
    "English": "الإنجليزية",
    "Urdu": "الأردية",
    "Arabic": "العربية",
  },
};

const PreferencesContext = createContext(null);

function validLanguage(value) {
  return LANGUAGE_OPTIONS.some((item) => item.code === value) ? value : "en";
}

function validTheme(value) {
  return THEME_OPTIONS.some((item) => item.code === value) ? value : "light";
}

function readPreference(key, fallback) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) || fallback;
}

function resolveEffectiveTheme(theme) {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function translateText(text, language) {
  if (!text || language === "en") return text;
  return DICTIONARY[language]?.[text] || text;
}

export function PortalPreferencesProvider({ children }) {
  const [language, setLanguageState] = useState(() => validLanguage(readPreference("rawyan_language", "en")));
  const [theme, setThemeState] = useState(() => validTheme(readPreference("rawyan_theme", "light")));
  const [dynamicTranslations, setDynamicTranslations] = useState({});
  const pendingRef = useRef(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("rawyan_language", language);
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = RTL_LANGS.has(language) ? "rtl" : "ltr";
    }
  }, [language]);

  useEffect(() => {
    function applyTheme() {
      const effectiveTheme = resolveEffectiveTheme(theme);
      if (typeof window !== "undefined") window.localStorage.setItem("rawyan_theme", theme);
      if (typeof document !== "undefined") {
        document.documentElement.dataset.theme = effectiveTheme;
        document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
      }
    }

    applyTheme();
    if (theme !== "system" || typeof window === "undefined") return undefined;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    media.addEventListener?.("change", applyTheme);
    return () => media.removeEventListener?.("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    setDynamicTranslations({});
    pendingRef.current.clear();
  }, [language]);

  const requestTranslation = useCallback(async (text) => {
    if (!text || language === "en") return;
    if (DICTIONARY[language]?.[text] || dynamicTranslations[text] || pendingRef.current.has(text)) return;
    pendingRef.current.add(text);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${language}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = Array.isArray(data?.[0]) ? data[0].map((row) => row?.[0] || "").join("") : "";
      if (translated) setDynamicTranslations((prev) => ({ ...prev, [text]: translated }));
    } catch (_error) {
      // Offline or blocked translation keeps source text safely.
    } finally {
      pendingRef.current.delete(text);
    }
  }, [dynamicTranslations, language]);

  const setLanguage = useCallback((nextLanguage) => setLanguageState(validLanguage(nextLanguage)), []);
  const setTheme = useCallback((nextTheme) => setThemeState(validTheme(nextTheme)), []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    theme,
    setTheme,
    effectiveTheme: resolveEffectiveTheme(theme),
    isRTL: RTL_LANGS.has(language),
    languageOptions: LANGUAGE_OPTIONS,
    themeOptions: THEME_OPTIONS,
    t: (text) => {
      const base = translateText(text, language);
      if (base !== text || !text || language === "en") return base;
      if (dynamicTranslations[text]) return dynamicTranslations[text];
      requestTranslation(text);
      return text;
    },
  }), [dynamicTranslations, language, requestTranslation, setLanguage, setTheme, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePortalPreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePortalPreferences must be used inside PortalPreferencesProvider");
  return ctx;
}
