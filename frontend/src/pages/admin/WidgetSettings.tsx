import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Settings, Copy, CheckCircle, Code, Sparkles, Palette, Layout, MessageSquare, Zap, Save, RotateCcw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import type { WidgetConfig } from '../../types';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { apiService } from '../../services/api';

export const WidgetSettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'style' | 'position' | 'content'>('style');
  const [config, setConfig] = useState<WidgetConfig | null>(null); // Start as null
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [initialConfig, setInitialConfig] = useState<WidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  // Helper function to map backend to frontend format
  const mapBackendToFrontend = (backendSettings: any): WidgetConfig => {
    return {
      apiUrl: backendSettings.apiUrl || window.location.origin,
      position: backendSettings.widgetPosition || 'bottom-right',
      primaryColor: backendSettings.primaryColor || '#1e40af',
      accentColor: backendSettings.accentColor || '#0ea5e9',
      buttonSize: backendSettings.buttonSize || 'medium',
      greeting: backendSettings.greetingMessage || 'Hi! How can I help you today?',
      title: backendSettings.widgetTitle || 'Githaf AI Assistant',
      subtitle: backendSettings.widgetSubtitle || 'Always here to help',
      zIndex: backendSettings.zIndex || 9999,
      theme: backendSettings.widgetTheme || 'modern',
      showNotificationBadge: backendSettings.showNotificationBadge ?? true,
      paddingX: backendSettings.horizontalPadding || 20,
      paddingY: backendSettings.verticalPadding || 20,
    };
  };

  // Helper function to map frontend to backend format
  const mapFrontendToBackend = (frontendConfig: WidgetConfig) => {
    return {
      widgetPosition: frontendConfig.position,
      primaryColor: frontendConfig.primaryColor,
      accentColor: frontendConfig.accentColor,
      buttonSize: frontendConfig.buttonSize,
      showNotificationBadge: frontendConfig.showNotificationBadge,
      horizontalPadding: frontendConfig.paddingX,
      verticalPadding: frontendConfig.paddingY,
      zIndex: frontendConfig.zIndex,
      widgetTheme: frontendConfig.theme,
      widgetTitle: frontendConfig.title,
      widgetSubtitle: frontendConfig.subtitle,
      greetingMessage: frontendConfig.greeting,
      apiUrl: frontendConfig.apiUrl,
    };
  };

  // Load saved settings on mount from backend API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiService.getWidgetSettings();
        // Extract settings from wrapped response {settings: {...}, version: "...", timestamp: "..."}
        const backendSettings = response.settings || response;
        const mappedConfig = mapBackendToFrontend(backendSettings);
        setConfig(mappedConfig);
        // Create deep copy for initial config tracking
        setInitialConfig(JSON.parse(JSON.stringify(mappedConfig)));
        // Also save to localStorage as cache
        localStorage.setItem('widgetConfig', JSON.stringify(mappedConfig));
      } catch (error) {
        console.error('Failed to load widget settings from backend:', error);
        // Fallback to localStorage or defaults
        const saved = localStorage.getItem('widgetConfig');
        if (saved) {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
          setInitialConfig(JSON.parse(JSON.stringify(parsedConfig)));
        } else {
          // Use defaults if nothing exists
          const defaults: WidgetConfig = {
            apiUrl: window.location.origin,
            position: 'bottom-right',
            primaryColor: '#1e40af',
            accentColor: '#0ea5e9',
            buttonSize: 'medium',
            greeting: 'Hi! How can I help you today?',
            title: 'Githaf AI Assistant',
            subtitle: 'Always here to help',
            zIndex: 9999,
            theme: 'modern',
            showNotificationBadge: true,
            paddingX: 20,
            paddingY: 20,
          };
          setConfig(defaults);
          setInitialConfig(JSON.parse(JSON.stringify(defaults)));
        }
      } finally {
        setIsLoading(false); // Stop loading
      }
    };
    loadSettings();
  }, []);

  // Check if settings have changed (use useMemo to avoid recalculating on every render)
  const hasChanges = useMemo(() => {
    if (!initialConfig || !config) return false;
    return JSON.stringify(config) !== JSON.stringify(initialConfig);
  }, [config, initialConfig]);

  // Generate static preview HTML (memoized - only runs once on mount)
  const previewHTML = useMemo(() => {
    const savedConfig = localStorage.getItem('widgetConfig');
    const initialConfig = savedConfig ? JSON.parse(savedConfig) : (config || {
      apiUrl: window.location.origin,
      position: 'bottom-right',
      primaryColor: '#1e40af',
      accentColor: '#0ea5e9',
      buttonSize: 'medium',
      greeting: 'Hi! How can I help you today?',
      title: 'Githaf AI Assistant',
      subtitle: 'Always here to help',
      zIndex: 9999,
      theme: 'modern',
      showNotificationBadge: true,
      paddingX: 20,
      paddingY: 20,
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .content {
      text-align: center;
      color: white;
      padding: 40px;
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { font-size: 1.1rem; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="content">
    <h1>🎯 Live Widget Preview</h1>
    <p>This is how your widget will appear on your website</p>
    <p style="font-size: 0.9rem; margin-top: 2rem; opacity: 0.7;">Look for the chat button in the corner →</p>
  </div>

  <script>
    // Initial config (with adminPreview enabled for sources display)
    window.GithafChatConfig = ${JSON.stringify({...initialConfig, adminPreview: true}, null, 2)};

    // Listen for config updates from parent
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'updateWidgetConfig') {
        const newConfig = event.data.config;

        // Update global config
        window.GithafChatConfig = newConfig;

        // Find widget elements
        const container = document.getElementById('githaf-chat-widget-container');
        const button = document.getElementById('githaf-chat-widget-button');
        const iframe = document.getElementById('githaf-chat-widget-iframe');

        if (container && button) {
          // Update button position
          const positions = {
            'bottom-right': { bottom: newConfig.paddingY + 'px', right: newConfig.paddingX + 'px', top: '', left: '' },
            'bottom-left': { bottom: newConfig.paddingY + 'px', left: newConfig.paddingX + 'px', top: '', right: '' },
            'top-right': { top: newConfig.paddingY + 'px', right: newConfig.paddingX + 'px', bottom: '', left: '' },
            'top-left': { top: newConfig.paddingY + 'px', left: newConfig.paddingX + 'px', bottom: '', right: '' }
          };

          const pos = positions[newConfig.position];
          container.style.top = pos.top;
          container.style.bottom = pos.bottom;
          container.style.left = pos.left;
          container.style.right = pos.right;
          container.style.zIndex = newConfig.zIndex;

          // Update button size
          const buttonSizes = {
            small: { width: '50px', height: '50px', iconSize: '20px' },
            medium: { width: '60px', height: '60px', iconSize: '24px' },
            large: { width: '70px', height: '70px', iconSize: '28px' }
          };
          const btnSize = buttonSizes[newConfig.buttonSize];
          button.style.width = btnSize.width;
          button.style.height = btnSize.height;

          // Update button colors/theme
          const themes = {
            modern: \`background: linear-gradient(135deg, \${newConfig.primaryColor}, \${newConfig.accentColor}); border: none; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);\`,
            minimal: \`background: \${newConfig.primaryColor}; border: 2px solid \${newConfig.accentColor}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\`,
            classic: \`background: linear-gradient(to bottom, \${newConfig.primaryColor}, \${newConfig.accentColor}); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);\`
          };
          button.style.cssText = button.style.cssText.split(';').filter(s =>
            !s.includes('background') && !s.includes('border:') && !s.includes('border ') && !s.includes('box-shadow')
          ).join(';') + '; border-radius: 50%; ' + themes[newConfig.theme];

          // Update notification badge visibility
          const badge = document.getElementById('githaf-chat-badge');
          const shouldShowBadge = newConfig.showNotificationBadge && newConfig.theme !== 'minimal';

          if (shouldShowBadge && !badge) {
            // Add badge if it should show and doesn't exist
            const newBadge = document.createElement('div');
            newBadge.id = 'githaf-chat-badge';
            newBadge.style.cssText = \`
              position: absolute;
              top: -4px;
              right: -4px;
              width: 12px;
              height: 12px;
              background: #ef4444;
              border-radius: 50%;
              border: 2px solid white;
              animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            \`;
            button.appendChild(newBadge);
          } else if (!shouldShowBadge && badge) {
            // Remove badge if it shouldn't show but exists
            badge.remove();
          }

          // Send content updates to inner ChatWidget iframe via postMessage (no reload!)
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'updateChatContent',
              title: newConfig.title,
              subtitle: newConfig.subtitle,
              greeting: newConfig.greeting
            }, '*');
          }
        }
      }
    });
  </script>
  <script src="${initialConfig.apiUrl}/embed.js?v=${Date.now()}"></script>
</body>
</html>`;
  }, []); // Empty dependency array - only generate once on mount

  // Send config updates to iframe via postMessage (no reload)
  useEffect(() => {
    // Skip sending message until iframe is loaded and config is ready
    if (!previewLoaded || !config) return;

    const timer = setTimeout(() => {
      localStorage.setItem('widgetConfig', JSON.stringify(config));

      // Send message to iframe to update widget
      if (previewIframeRef.current && previewIframeRef.current.contentWindow) {
        previewIframeRef.current.contentWindow.postMessage({
          type: 'updateWidgetConfig',
          config: config
        }, '*');
      }
    }, 300); // Reduced debounce for faster updates

    return () => clearTimeout(timer);
  }, [config, previewLoaded]);

  const generateEmbedCode = () => {
    if (!config) return '';
    return `<!-- Githaf Chat Widget -->
<script>
  window.GithafChatConfig = {
    apiUrl: '${config.apiUrl}',
    position: '${config.position}',
    primaryColor: '${config.primaryColor}',
    accentColor: '${config.accentColor}',
    buttonSize: '${config.buttonSize}',
    greeting: '${config.greeting}',
    title: '${config.title}',
    subtitle: '${config.subtitle}',
    zIndex: ${config.zIndex},
    theme: '${config.theme}',
    showNotificationBadge: ${config.showNotificationBadge},
    paddingX: ${config.paddingX},
    paddingY: ${config.paddingY}
  };
</script>
<script src="${config.apiUrl}/embed.js" async></script>`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleReset = () => {
    // Restore to last saved settings
    if (initialConfig) {
      setConfig(JSON.parse(JSON.stringify(initialConfig)));
      toast.success('Settings restored to last saved state.', {
        duration: 2000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#64748b',
          border: '1px solid #475569',
          fontWeight: '500',
          fontSize: '14px',
        },
      });
    }
  };

  const performSave = async () => {
    if (!config) return;

    // Show loading toast
    const toastId = toast.loading('Saving widget settings...', {
      position: 'top-center',
      style: {
        background: '#1e293b',
        color: '#e2e8f0',
        border: '1px solid #475569',
        fontWeight: '500',
        fontSize: '14px',
      },
    });

    try {
      // Map frontend config to backend format
      const backendConfig = mapFrontendToBackend(config);

      // Save to backend API
      const response = await apiService.updateWidgetSettings(backendConfig);

      // Also save to localStorage as cache
      localStorage.setItem('widgetConfig', JSON.stringify(config));

      // Update initial config to current (no more changes) - use deep copy
      setInitialConfig(JSON.parse(JSON.stringify(config)));

      // Show success state
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // Update toast to success
      toast.success('Settings saved successfully. Changes are now live on all embedded widgets.', {
        id: toastId,
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#10b981',
          border: '1px solid #10b981',
          fontWeight: '500',
          fontSize: '14px',
        },
      });
    } catch (error) {
      console.error('Failed to save widget settings:', error);

      // Update toast to error
      toast.error('Failed to save widget settings. Please try again.', {
        id: toastId,
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#1e293b',
          color: '#ef4444',
          border: '1px solid #ef4444',
          fontWeight: '500',
          fontSize: '14px',
        },
      });
    }
  };


  // Show loading skeleton while loading
  if (isLoading || !config) {
    return (
      <motion.div
        className="h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-700 animate-pulse" />
            <div>
              <div className="h-8 w-64 bg-slate-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-32 bg-slate-700 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-10 bg-slate-700 rounded" />
              <div className="h-10 bg-slate-700 rounded" />
              <div className="h-10 bg-slate-700 rounded" />
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 animate-pulse">
            <div className="h-full bg-slate-700 rounded" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      {/* Toast Notifications */}
      <Toaster />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Save className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-50 mb-1">
                  Save Widget Settings?
                </h3>
                <p className="text-sm text-slate-400">
                  These changes will be applied to all embedded widgets on your website within 30 seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <motion.button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={async () => {
                  setShowConfirmModal(false);
                  await performSave();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle size={16} />
                Yes, Save Changes
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        className="h-full"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Header */}
      <motion.div variants={staggerItem} className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Settings className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Widget Customization</h1>
            <p className="text-slate-400 text-sm mt-0.5">Customize and embed your chatbot</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Reset Button - only show when there are unsaved changes */}
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw size={18} />
              Reset
            </motion.button>
          )}

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : hasChanges
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
            whileHover={hasChanges ? { scale: 1.02 } : {}}
            whileTap={hasChanges ? { scale: 0.98 } : {}}
          >
            {saved ? (
              <>
                <CheckCircle size={18} />
                Saved
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)] grid-rows-1">
        {/* Left Panel - Settings */}
        <motion.div variants={staggerItem} className="flex flex-col h-full min-h-0">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl h-full flex flex-col overflow-hidden min-h-0">
            {/* Section Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-800/50">
              <button
                onClick={() => setActiveSection('style')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeSection === 'style'
                    ? 'text-primary-400 border-b-2 border-primary-400 bg-slate-700/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/20'
                }`}
              >
                <Palette size={16} />
                Style
              </button>
              <button
                onClick={() => setActiveSection('position')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeSection === 'position'
                    ? 'text-primary-400 border-b-2 border-primary-400 bg-slate-700/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/20'
                }`}
              >
                <Layout size={16} />
                Position
              </button>
              <button
                onClick={() => setActiveSection('content')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeSection === 'content'
                    ? 'text-primary-400 border-b-2 border-primary-400 bg-slate-700/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/20'
                }`}
              >
                <MessageSquare size={16} />
                Content
              </button>
            </div>

            {/* Unified Scrollable Content - Settings + Embed Code */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Style Section */}
              {activeSection === 'style' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Theme Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['modern', 'minimal', 'classic'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => setConfig({ ...config, theme })}
                          className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                            config.theme === theme
                              ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                              : 'border-slate-600 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Primary Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="w-12 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-slate-700"
                        />
                        <input
                          type="text"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="input flex-1 text-sm"
                          placeholder="#1e40af"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Accent Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={config.accentColor}
                          onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                          className="w-12 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-slate-700"
                        />
                        <input
                          type="text"
                          value={config.accentColor}
                          onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                          className="input flex-1 text-sm"
                          placeholder="#0ea5e9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Button Size */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Button Size
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setConfig({ ...config, buttonSize: size })}
                          className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                            config.buttonSize === size
                              ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                              : 'border-slate-600 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notification Badge */}
                  <div className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-slate-200">
                        Notification Badge
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">Show pulsing dot on button</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showNotificationBadge}
                        onChange={(e) => setConfig({ ...config, showNotificationBadge: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Position Section */}
              {activeSection === 'position' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {/* Corner Position - Visual Picker with Depth */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Screen Position
                    </label>
                    <div className="relative bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-xl p-5 border border-slate-600/50 shadow-lg">
                      {/* Screen representation with depth */}
                      <div className="relative w-full h-40 bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg border-2 border-slate-700/50 shadow-inner overflow-hidden">
                        {/* Subtle grid pattern */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                          backgroundSize: '20px 20px'
                        }}></div>

                        {/* Corner buttons with elevation */}
                        <button
                          onClick={() => setConfig({ ...config, position: 'top-left' })}
                          className={`absolute top-2 left-2 w-7 h-7 rounded-full transition-all shadow-lg z-10 ${
                            config.position === 'top-left'
                              ? 'bg-gradient-to-br from-primary-400 to-primary-600 ring-3 ring-primary-500/50 scale-110'
                              : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 hover:scale-105'
                          }`}
                          title="Top Left"
                        />
                        <button
                          onClick={() => setConfig({ ...config, position: 'top-right' })}
                          className={`absolute top-2 right-2 w-7 h-7 rounded-full transition-all shadow-lg z-10 ${
                            config.position === 'top-right'
                              ? 'bg-gradient-to-br from-primary-400 to-primary-600 ring-3 ring-primary-500/50 scale-110'
                              : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 hover:scale-105'
                          }`}
                          title="Top Right"
                        />
                        <button
                          onClick={() => setConfig({ ...config, position: 'bottom-left' })}
                          className={`absolute bottom-2 left-2 w-7 h-7 rounded-full transition-all shadow-lg z-10 ${
                            config.position === 'bottom-left'
                              ? 'bg-gradient-to-br from-primary-400 to-primary-600 ring-3 ring-primary-500/50 scale-110'
                              : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 hover:scale-105'
                          }`}
                          title="Bottom Left"
                        />
                        <button
                          onClick={() => setConfig({ ...config, position: 'bottom-right' })}
                          className={`absolute bottom-2 right-2 w-7 h-7 rounded-full transition-all shadow-lg z-10 ${
                            config.position === 'bottom-right'
                              ? 'bg-gradient-to-br from-primary-400 to-primary-600 ring-3 ring-primary-500/50 scale-110'
                              : 'bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 hover:scale-105'
                          }`}
                          title="Bottom Right"
                        />

                        {/* Center label with subtle glow */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                          <span className="text-slate-400 text-xs font-medium px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700/50 shadow-sm">
                            {config.position.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Padding */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Horizontal Spacing
                      </label>
                      <input
                        type="number"
                        value={config.paddingX}
                        onChange={(e) => setConfig({ ...config, paddingX: parseInt(e.target.value) || 0 })}
                        className="input w-full"
                        min="0"
                        max="200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">
                        Vertical Spacing
                      </label>
                      <input
                        type="number"
                        value={config.paddingY}
                        onChange={(e) => setConfig({ ...config, paddingY: parseInt(e.target.value) || 0 })}
                        className="input w-full"
                        min="0"
                        max="200"
                      />
                    </div>
                  </div>

                  {/* Z-Index */}
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Layer Priority (Z-Index)
                    </label>
                    <input
                      type="number"
                      value={config.zIndex}
                      onChange={(e) => setConfig({ ...config, zIndex: parseInt(e.target.value) || 9999 })}
                      className="input w-full"
                      placeholder="9999"
                    />
                    <p className="text-xs text-slate-400 mt-1">Higher values appear above other elements</p>
                  </div>
                </motion.div>
              )}

              {/* Content Section */}
              {activeSection === 'content' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {/* Info Banner */}
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-xs text-blue-200">
                    💡 <strong>Tip:</strong> Click the chat button in the preview to see title & subtitle changes
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Widget Title
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      className="input w-full"
                      placeholder="Githaf AI Assistant"
                    />
                    <p className="text-xs text-slate-400 mt-1">Shown in chat window header</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={config.subtitle}
                      onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      className="input w-full"
                      placeholder="Always here to help"
                    />
                    <p className="text-xs text-slate-400 mt-1">Shown below title in header</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Welcome Message
                    </label>
                    <textarea
                      value={config.greeting}
                      onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                      className="input w-full"
                      rows={3}
                      placeholder="Hi! How can I help you today?"
                    />
                    <p className="text-xs text-slate-400 mt-1">First message shown when chat opens</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      API URL
                    </label>
                    <input
                      type="text"
                      value={config.apiUrl}
                      onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                      className="input w-full"
                      placeholder="https://your-domain.com"
                    />
                    <p className="text-xs text-slate-400 mt-1">Frontend URL where widget script is hosted</p>
                  </div>
                </motion.div>
              )}

              {/* Embed Code Section - Inline */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Code size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">Embed Code</span>
                  </div>
                  <motion.button
                    onClick={copyToClipboard}
                    className={`text-xs px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </motion.button>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                  <pre className="text-[10px] text-green-400 leading-relaxed">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Panel - Live Preview */}
        <motion.div variants={staggerItem} className="flex flex-col h-full min-h-0">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl h-full flex flex-col overflow-hidden min-h-0">
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-yellow-400" />
                <span className="font-medium text-slate-200">Live Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-slate-400">Updates in real-time</span>
              </div>
            </div>

            {/* Preview Iframe */}
            <div className="flex-1 relative bg-slate-900 rounded-b-xl overflow-hidden" style={{ transform: 'translateZ(0)', isolation: 'isolate' }}>
              <iframe
                ref={previewIframeRef}
                srcDoc={previewHTML}
                onLoad={() => setPreviewLoaded(true)}
                className="w-full h-full border-0"
                style={{
                  transform: 'translateZ(0)',
                  WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                  isolation: 'isolate'
                }}
                title="Widget Preview"
              />
            </div>

            {/* Preview Info */}
            <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-400">
              <p>💡 This preview shows exactly how your widget will appear on your website</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
    </>
  );
};
