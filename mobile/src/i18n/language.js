export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' },
  { code: 'es', label: 'Spanish' },
];

const dictionary = {
  ur: {
    'Search this dashboard...': 'اس ڈیش بورڈ میں تلاش کریں...',
    'No match found.': 'کوئی نتیجہ نہیں ملا۔',
    'Account Settings': 'اکاؤنٹ سیٹنگز',
    'Change Password': 'پاس ورڈ تبدیل کریں',
    'Logout': 'لاگ آؤٹ',
    'Language': 'زبان',
    'Deep search modules...': 'ماڈیولز میں گہری تلاش...',
    'No modules found for this search.': 'اس تلاش کے لیے کوئی ماڈیول نہیں ملا۔',
    'Settings': 'سیٹنگز',
    'Dashboard': 'ڈیش بورڈ',
  },
  ar: {
    'Search this dashboard...': 'ابحث في هذه اللوحة...',
    'No match found.': 'لا توجد نتائج.',
    'Account Settings': 'إعدادات الحساب',
    'Change Password': 'تغيير كلمة المرور',
    'Logout': 'تسجيل الخروج',
    'Language': 'اللغة',
    'Deep search modules...': 'بحث عميق في الوحدات...',
    'No modules found for this search.': 'لا توجد وحدات لهذا البحث.',
    'Settings': 'الإعدادات',
    'Dashboard': 'لوحة التحكم',
  },
  es: {
    'Search this dashboard...': 'Buscar en este panel...',
    'No match found.': 'No se encontraron resultados.',
    'Account Settings': 'Configuración de cuenta',
    'Change Password': 'Cambiar contraseña',
    'Logout': 'Cerrar sesión',
    'Language': 'Idioma',
    'Deep search modules...': 'Búsqueda profunda de módulos...',
    'No modules found for this search.': 'No se encontraron módulos para esta búsqueda.',
    'Settings': 'Configuración',
    'Dashboard': 'Panel',
  },
};

export function translateText(text, language = 'en') {
  if (!text) return text;
  if (language === 'en') return text;
  return dictionary[language]?.[text] || text;
}
