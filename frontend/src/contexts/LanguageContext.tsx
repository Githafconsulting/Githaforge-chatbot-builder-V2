import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type LanguageCode = 'en' | 'fr' | 'de' | 'es' | 'ar';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  defaultLanguage: LanguageCode;
  setDefaultLanguage: (lang: LanguageCode) => void;
  enabledLanguages: LanguageCode[];
  setEnabledLanguages: (langs: LanguageCode[]) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();

  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('i18nextLng');
    return (saved as LanguageCode) || 'en';
  });

  const [defaultLanguage, setDefaultLanguageState] = useState<LanguageCode>(() => {
    const systemSettings = localStorage.getItem('systemSettings');
    if (systemSettings) {
      try {
        const settings = JSON.parse(systemSettings);
        return settings.defaultLanguage || 'en';
      } catch (e) {
        return 'en';
      }
    }
    return 'en';
  });

  const [enabledLanguages, setEnabledLanguagesState] = useState<LanguageCode[]>(() => {
    const systemSettings = localStorage.getItem('systemSettings');
    if (systemSettings) {
      try {
        const settings = JSON.parse(systemSettings);
        return settings.enabledLanguages || ['en', 'fr', 'de', 'es', 'ar'];
      } catch (e) {
        return ['en', 'fr', 'de', 'es', 'ar'];
      }
    }
    return ['en', 'fr', 'de', 'es', 'ar'];
  });

  const setLanguage = (lang: LanguageCode) => {
    setCurrentLanguageState(lang);
    setDefaultLanguageState(lang); // Also update default language
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);

    // Apply RTL if Arabic
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  };

  const setDefaultLanguage = (lang: LanguageCode) => {
    setDefaultLanguageState(lang);
    // Also update current language to match default
    setCurrentLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);

    // Apply RTL if Arabic
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  };

  const setEnabledLanguages = (langs: LanguageCode[]) => {
    setEnabledLanguagesState(langs);
  };

  // Sync with i18n changes
  useEffect(() => {
    if (i18n.language !== currentLanguage) {
      setCurrentLanguageState(i18n.language as LanguageCode);
    }
  }, [i18n.language]);

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setLanguage,
      defaultLanguage,
      setDefaultLanguage,
      enabledLanguages,
      setEnabledLanguages
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
