import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export const LanguageSelector: React.FC = () => {
  const { currentLanguage: currentLangCode, defaultLanguage: defaultLangCode, setLanguage, enabledLanguages: enabledLangCodes } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const enabledLanguages = languages.filter(lang => enabledLangCodes.includes(lang.code as any));
  const currentLanguage = languages.find(lang => lang.code === currentLangCode) || languages[0];
  const defaultLanguage = languages.find(lang => lang.code === defaultLangCode) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    setLanguage(languageCode as any);
    setIsOpen(false);
  };

  // If only one language is enabled, don't show the selector
  if (enabledLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-200 hover:text-white"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`Default language: ${defaultLanguage.nativeName}`}
      >
        <Globe size={20} />
        <span className="text-xl">{defaultLanguage.flag}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 bg-slate-800/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-strong overflow-hidden min-w-[200px] max-w-[240px] z-50"
              style={{
                maxHeight: 'calc(100vh - 100px)',
                overflowY: 'auto'
              }}
            >
              <div className="p-2">
                {enabledLanguages.map((language) => {
                  const isActive = currentLangCode === language.code;

                  return (
                    <motion.button
                      key={language.code}
                      onClick={() => handleLanguageChange(language.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-200 hover:bg-slate-700 hover:text-white'
                      }`}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl">{language.flag}</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{language.nativeName}</div>
                        <div className="text-xs opacity-75">{language.name}</div>
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          <Check size={18} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
