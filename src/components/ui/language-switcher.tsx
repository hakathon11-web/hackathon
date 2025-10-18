import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

const languages = {
  ka: { code: 'ka', label: 'ka', flag: '🇬🇪' },
  en: { code: 'en', label: 'en', flag: '🇬🇧' }
};

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Sync with i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
      console.log('🌐 Language changed to:', lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    // Set initial language
    setCurrentLanguage(i18n.language);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const toggleLanguage = useCallback(async () => {
    try {
      const newLang = currentLanguage === 'ka' ? 'en' : 'ka';
      
      // Change the language
      await i18n.changeLanguage(newLang);

      // Ensure localStorage is updated
      localStorage.setItem('i18nextLng', newLang);
    } catch (error) {
      console.error('❌ Error switching language:', error);
    }
  }, [currentLanguage, i18n]);

  const currentLang = useMemo(() => 
    languages[currentLanguage as keyof typeof languages] || languages.ka, 
    [currentLanguage]
  );
  
  const nextLang = useMemo(() => 
    languages[currentLanguage === 'ka' ? 'en' : 'ka'], 
    [currentLanguage]
  );

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
        "bg-gray-100 hover:bg-gray-200",
        "text-sm font-medium relative overflow-hidden",
        "dark:bg-gray-600 dark:hover:bg-gray-500"
      )}
      title={`Switch to ${nextLang.label}`}
    >
      <span className="text-lg">{currentLang.flag}</span>
    </button>
  );
};

// Mobile-only flag language switcher for header
export const MobileFlagLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Sync with i18n language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);
    setCurrentLanguage(i18n.language);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const toggleLanguage = useCallback(async () => {
    try {
      const newLang = currentLanguage === 'ka' ? 'en' : 'ka';
      await i18n.changeLanguage(newLang);
      localStorage.setItem('i18nextLng', newLang);
    } catch (error) {
      console.error('❌ Error switching language:', error);
    }
  }, [currentLanguage, i18n]);

  const currentLang = useMemo(() => 
    languages[currentLanguage as keyof typeof languages] || languages.ka, 
    [currentLanguage]
  );
  
  const nextLang = useMemo(() => 
    languages[currentLanguage === 'ka' ? 'en' : 'ka'], 
    [currentLanguage]
  );

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center w-8 h-8 bg-muted rounded-full border border-border shadow-sm hover:bg-muted/80 hover:border-border/80 transition-all duration-200 focus:ring-2 focus:ring-ring focus:ring-opacity-50 focus:border-primary dark:bg-gray-600 dark:border-gray-500 dark:hover:bg-gray-500"
      title={`Switch to ${nextLang.label === 'ka' ? 'Georgian' : 'English'}`}
      aria-label={`Switch to ${nextLang.label === 'ka' ? 'Georgian' : 'English'}`}
    >
      <span className="text-lg">{currentLang.flag}</span>
    </button>
  );
};