import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Save, Globe, Palette, BarChart3, Shield, CheckCircle, AlertCircle, ChevronDown, X } from 'lucide-react';
import type { SystemSettings } from '../../types';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { apiService } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export const SystemSettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { currentLanguage, setDefaultLanguage, setEnabledLanguages } = useLanguage();
  const [settings, setSettings] = useState<SystemSettings>({
    // Theme Settings
    defaultTheme: 'dark',
    allowThemeSwitching: true,
    inheritHostTheme: true,

    // Language Settings
    defaultLanguage: 'en',
    enabledLanguages: ['en', 'fr', 'de', 'es', 'ar'],
    translateAIResponses: true,
    enableRTL: true,

    // Analytics Settings
    enableCountryTracking: true,
    defaultDateRange: '30d',
    enableWorldMap: true,

    // Privacy Settings
    anonymizeIPs: true,
    storeIPAddresses: false,
  });

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const updatedSettings = await apiService.updateSystemSettings(settings);
      // Also save to localStorage for immediate UI updates
      localStorage.setItem('systemSettings', JSON.stringify(updatedSettings));
      // Apply theme immediately
      setTheme(settings.defaultTheme);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Sync theme changes from dropdown to actual theme
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setSettings({ ...settings, defaultTheme: newTheme });
    setTheme(newTheme);
  };

  // Sync language changes from dropdown to actual language
  const handleDefaultLanguageChange = (newLang: 'en' | 'fr' | 'de' | 'es' | 'ar') => {
    setSettings({ ...settings, defaultLanguage: newLang });
    setDefaultLanguage(newLang);
  };

  // Sync enabled languages changes
  const handleEnabledLanguagesChange = (langs: ('en' | 'fr' | 'de' | 'es' | 'ar')[]) => {
    setSettings({ ...settings, enabledLanguages: langs });
    setEnabledLanguages(langs);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const fetchedSettings = await apiService.getSystemSettings();
        setSettings(fetchedSettings);
        // Sync theme with loaded settings
        setTheme(fetchedSettings.defaultTheme);
        // Sync language with loaded settings
        setDefaultLanguage(fetchedSettings.defaultLanguage);
        setEnabledLanguages(fetchedSettings.enabledLanguages);
        // Also save to localStorage for offline access
        localStorage.setItem('systemSettings', JSON.stringify(fetchedSettings));
      } catch (err) {
        console.error('Failed to load settings:', err);
        // Fallback to localStorage if backend fails
        const saved = localStorage.getItem('systemSettings');
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          setSettings(parsedSettings);
          setTheme(parsedSettings.defaultTheme);
          setDefaultLanguage(parsedSettings.defaultLanguage);
          setEnabledLanguages(parsedSettings.enabledLanguages);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Sync current theme to settings when theme changes externally
  useEffect(() => {
    setSettings(prev => ({ ...prev, defaultTheme: theme }));
  }, [theme]);

  // Sync current language to settings when language changes externally
  useEffect(() => {
    setSettings(prev => ({ ...prev, defaultLanguage: currentLanguage }));
  }, [currentLanguage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-dropdown')) {
        setLanguageDropdownOpen(false);
      }
    };

    if (languageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [languageDropdownOpen]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  ];

  const toggleLanguage = (code: 'en' | 'fr' | 'de' | 'es' | 'ar') => {
    const enabled = settings.enabledLanguages.includes(code);
    if (enabled && settings.enabledLanguages.length === 1) {
      // Can't disable all languages
      return;
    }
    const newLanguages = enabled
      ? settings.enabledLanguages.filter((l) => l !== code)
      : [...settings.enabledLanguages, code];
    handleEnabledLanguagesChange(newLanguages);
  };

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <SettingsIcon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">System Settings</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Configure themes, languages, analytics, and privacy
            </p>
          </div>
        </div>

        <motion.button
          onClick={handleSave}
          disabled={loading || saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl shadow-md transition-colors ${
            saved
              ? 'bg-green-600 hover:bg-green-700'
              : 'btn-primary'
          } ${(loading || saving) ? 'opacity-50 cursor-not-allowed' : ''}`}
          whileHover={{ scale: (loading || saving) ? 1 : 1.05 }}
          whileTap={{ scale: (loading || saving) ? 1 : 0.98 }}
        >
          {saving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle size={20} />
              Settings Saved!
            </>
          ) : (
            <>
              <Save size={20} />
              Save All Settings
            </>
          )}
        </motion.button>
      </motion.div>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-12"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
            />
            <p className="text-slate-300">Loading settings...</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Settings */}
        <motion.div variants={staggerItem} className="card-hover rounded-2xl shadow-soft p-6">
          <h2 className="text-xl font-semibold text-slate-50 mb-4 flex items-center gap-2">
            <Palette size={24} className="text-purple-400" />
            Theme Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Default Theme
              </label>
              <select
                value={settings.defaultTheme}
                onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
                className="input w-full"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">
                Theme changes are applied immediately
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Allow Theme Switching
                </label>
                <p className="text-xs text-slate-400">
                  Let users toggle between light and dark mode
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowThemeSwitching}
                  onChange={(e) => setSettings({ ...settings, allowThemeSwitching: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Inherit Host Website Theme
                </label>
                <p className="text-xs text-slate-400">
                  Widget automatically matches host site's theme
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.inheritHostTheme}
                  onChange={(e) => setSettings({ ...settings, inheritHostTheme: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Language Settings */}
        <motion.div variants={staggerItem} className="card-hover rounded-2xl shadow-soft p-6">
          <h2 className="text-xl font-semibold text-slate-50 mb-4 flex items-center gap-2">
            <Globe size={24} className="text-blue-400" />
            Language Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Default Language
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => handleDefaultLanguageChange(e.target.value as 'en' | 'fr' | 'de' | 'es' | 'ar')}
                className="input w-full"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2">
                Language changes are applied immediately
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Enabled Languages
              </label>
              <div className="relative language-dropdown">
                <button
                  type="button"
                  onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                  className="input w-full flex items-center justify-between cursor-pointer"
                >
                  <div className="flex flex-wrap gap-2">
                    {settings.enabledLanguages.length === 0 ? (
                      <span className="text-slate-400">Select languages...</span>
                    ) : (
                      settings.enabledLanguages.map((code) => {
                        const lang = languages.find((l) => l.code === code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 border border-primary-500 rounded text-xs text-white"
                          >
                            {lang?.flag} {code.toUpperCase()}
                            <X
                              size={14}
                              className="cursor-pointer hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (settings.enabledLanguages.length > 1) {
                                  toggleLanguage(code as any);
                                }
                              }}
                            />
                          </span>
                        );
                      })
                    )}
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-slate-400 transition-transform ${
                      languageDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {languageDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-2 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-strong overflow-hidden"
                    >
                      {languages.map((lang) => {
                        const isEnabled = settings.enabledLanguages.includes(lang.code as any);
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              toggleLanguage(lang.code as any);
                            }}
                            disabled={isEnabled && settings.enabledLanguages.length === 1}
                            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                              isEnabled
                                ? 'bg-primary-500/20 text-white'
                                : 'text-slate-300 hover:bg-slate-600'
                            } ${isEnabled && settings.enabledLanguages.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <span className="flex-1">{lang.name}</span>
                            <span className="text-xs text-slate-400">{lang.code.toUpperCase()}</span>
                            {isEnabled && (
                              <CheckCircle size={16} className="text-primary-400" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                At least one language must be enabled. Click tags to remove.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Translate AI Responses
                </label>
                <p className="text-xs text-slate-400">
                  AI will respond in selected language
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.translateAIResponses}
                  onChange={(e) => setSettings({ ...settings, translateAIResponses: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Enable RTL Support
                </label>
                <p className="text-xs text-slate-400">
                  Support for right-to-left languages
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableRTL}
                  onChange={(e) => setSettings({ ...settings, enableRTL: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Analytics Settings */}
        <motion.div variants={staggerItem} className="card-hover rounded-2xl shadow-soft p-6">
          <h2 className="text-xl font-semibold text-slate-50 mb-4 flex items-center gap-2">
            <BarChart3 size={24} className="text-green-400" />
            Analytics Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Enable Country Tracking
                </label>
                <p className="text-xs text-slate-400">
                  Track visitor countries with flags
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableCountryTracking}
                  onChange={(e) => setSettings({ ...settings, enableCountryTracking: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Enable World Map
                </label>
                <p className="text-xs text-slate-400">
                  Show visitors on interactive world map
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableWorldMap}
                  onChange={(e) => setSettings({ ...settings, enableWorldMap: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Default Date Range
              </label>
              <select
                value={settings.defaultDateRange}
                onChange={(e) => setSettings({ ...settings, defaultDateRange: e.target.value as any })}
                className="input w-full"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
              <p className="text-xs text-blue-300 font-medium mb-1">Real-Time Updates Enabled</p>
              <p className="text-xs text-slate-400">
                Analytics refresh automatically with live data
              </p>
            </div>

            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
              <p className="text-xs text-green-300 font-medium mb-1">Export Formats Available</p>
              <p className="text-xs text-slate-400">
                CSV, Excel (.xlsx), and PDF exports enabled
              </p>
            </div>
          </div>
        </motion.div>

        {/* Privacy Settings */}
        <motion.div variants={staggerItem} className="card-hover rounded-2xl shadow-soft p-6">
          <h2 className="text-xl font-semibold text-slate-50 mb-4 flex items-center gap-2">
            <Shield size={24} className="text-amber-400" />
            Privacy Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Anonymize IP Addresses
                </label>
                <p className="text-xs text-slate-400">
                  Hash IPs for GDPR compliance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.anonymizeIPs}
                  onChange={(e) => setSettings({ ...settings, anonymizeIPs: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Store IP Addresses
                </label>
                <p className="text-xs text-slate-400">
                  Keep full IP addresses (not recommended)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.storeIPAddresses}
                  onChange={(e) => setSettings({ ...settings, storeIPAddresses: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
              <p className="text-xs text-amber-300 font-medium mb-1">⚠️ Privacy Notice</p>
              <p className="text-xs text-slate-400">
                We recommend enabling IP anonymization and disabling IP storage for GDPR compliance.
                Only country-level data will be tracked.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
