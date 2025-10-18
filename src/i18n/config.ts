import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ka from './locales/ka.json';
import en from './locales/en.json';

// Function to ensure proper language initialization
const initializeLanguage = () => {
  const savedLanguage = localStorage.getItem('i18nextLng');

  if (savedLanguage && (savedLanguage === 'ka' || savedLanguage === 'en')) {
    return savedLanguage;
  }

  // On first visit (no saved preference), default to Georgian
  return 'ka';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Force initial language to Georgian on first visit
    lng: initializeLanguage(),
    fallbackLng: 'ka',
    resources: {
      ka: {
        translation: ka
      },
      en: {
        translation: en
      }
    },
    detection: {
      // Only respect a previously saved choice; do not auto-detect from browser
      order: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,
      caches: ['localStorage'],
      excludeCacheFor: ['cimode']
    },
    interpolation: {
      escapeValue: false
    },
    // Return the key for missing keys instead of null
    returnNull: false,
    // Don't return objects for missing keys
    returnObjects: false,
    // Handle missing keys by returning the key
    missingKeyHandler: false,
    // Don't add missing keys to the translation files
    saveMissing: false
  }).then(() => {
    // Ensure the language is properly set
    const initialLanguage = initializeLanguage();
    if (i18n.language !== initialLanguage) {
      i18n.changeLanguage(initialLanguage);
    }
  }).catch((error) => {
    console.error('Critical: i18n initialization failed');
  });

// Make i18n available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).i18n = i18n;
  // Add debug functions
  (window as any).resetLanguageToEnglish = () => {
    localStorage.setItem('i18nextLng', 'en');
    i18n.changeLanguage('en');
    console.log('🔄 Language reset to English');
    window.location.reload();
  };
  (window as any).resetLanguageToGeorgian = () => {
    localStorage.setItem('i18nextLng', 'ka');
    i18n.changeLanguage('ka');
    console.log('🔄 Language reset to Georgian');
    window.location.reload();
  };
}

export default i18n;
