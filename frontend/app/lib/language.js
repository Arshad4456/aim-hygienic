"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "ar", label: "Arabic" },
  { code: "es", label: "Spanish" },
];

const RTL_LANGS = new Set(["ur", "ar"]);

const DICTIONARY = {
  ur: {
    "Language": "زبان",
    "Logout": "لاگ آؤٹ",
    "Search this dashboard...": "اس ڈیش بورڈ میں تلاش کریں...",
    "No results found.": "کوئی نتیجہ نہیں ملا۔",
    "No modules found for this search.": "اس تلاش کے لیے کوئی ماڈیول نہیں ملا۔",
    "AIM Hygienic ERP": "اے آئی ایم ہائجینک ای آر پی",
    "Dashboard": "ڈیش بورڈ",
    "Account Settings": "اکاؤنٹ سیٹنگز",
    "Change Password": "پاس ورڈ تبدیل کریں",
    "System Admin": "سسٹم ایڈمن",
    "Admin": "ایڈمن",
  },
  ar: {
    "Language": "اللغة",
    "Logout": "تسجيل الخروج",
    "Search this dashboard...": "ابحث في هذه اللوحة...",
    "No results found.": "لا توجد نتائج.",
    "No modules found for this search.": "لا توجد وحدات لهذا البحث.",
    "AIM Hygienic ERP": "نظام AIM Hygienic ERP",
    "Dashboard": "لوحة التحكم",
    "Account Settings": "إعدادات الحساب",
    "Change Password": "تغيير كلمة المرور",
    "System Admin": "مسؤول النظام",
    "Admin": "المسؤول",
  },
  es: {
    "Language": "Idioma",
    "Logout": "Cerrar sesión",
    "Search this dashboard...": "Buscar en este panel...",
    "No results found.": "No se encontraron resultados.",
    "No modules found for this search.": "No se encontraron módulos para esta búsqueda.",
    "AIM Hygienic ERP": "AIM Hygienic ERP",
    "Dashboard": "Panel",
    "Account Settings": "Configuración de cuenta",
    "Change Password": "Cambiar contraseña",
    "System Admin": "Administrador del sistema",
    "Admin": "Administrador",
  },
};

const LanguageContext = createContext(null);

export function translateText(text, language) {
  if (!text) return text;
  if (!language || language === "en") return text;
  return DICTIONARY[language]?.[text] || text;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("aim_language");
    return LANGUAGE_OPTIONS.some((opt) => opt.code === saved) ? saved : "en";
  });

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("aim_language", language);
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = RTL_LANGS.has(language) ? "rtl" : "ltr";
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    isRTL: RTL_LANGS.has(language),
    t: (text) => translateText(text, language),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
