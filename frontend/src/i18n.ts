import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import esTranslations from './locales/es.json';
import arTranslations from './locales/ar.json';

const resources = {
  en: { translation: enTranslations },
  fr: { translation: frTranslations },
  de: { translation: deTranslations },
  es: { translation: esTranslations },
  ar: { translation: arTranslations },
};

// Get default language from system settings
let defaultLanguage = 'en';
const systemSettings = localStorage.getItem('systemSettings');
if (systemSettings) {
  try {
    const settings = JSON.parse(systemSettings);
    defaultLanguage = settings.defaultLanguage || 'en';
  } catch (e) {
    // ignore
  }
}

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: defaultLanguage,
    lng: defaultLanguage,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Apply RTL on language change
i18n.on('languageChanged', (lng) => {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur']; // Arabic, Hebrew, Persian, Urdu

  if (rtlLanguages.includes(lng)) {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', lng);
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', lng);
  }
});

// Set initial direction and language
const currentLang = i18n.language || defaultLanguage;
const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
if (rtlLanguages.includes(currentLang)) {
  document.documentElement.setAttribute('dir', 'rtl');
} else {
  document.documentElement.setAttribute('dir', 'ltr');
}
document.documentElement.setAttribute('lang', currentLang);

export default i18n;
