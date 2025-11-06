import React, { createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWidget } from './components/chat/ChatWidget';
import { WidgetApiClient, createWidgetApi, configureWidgetApi } from './widget-api';
import './index.css';
import './i18n'; // Initialize i18next for widget

/**
 * Githaf Chat Widget - Standalone Entry Point
 *
 * This file exports the widget initialization function that can be called
 * from any external website to embed the chatbot directly in their DOM.
 */

export interface GithafChatConfig {
  backendUrl: string; // Backend API URL (e.g., https://api.githaf.com or http://localhost:8000)
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  accentColor?: string;
  buttonSize?: 'small' | 'medium' | 'large';
  greeting?: string;
  title?: string;
  subtitle?: string;
  zIndex?: number;
  theme?: 'modern' | 'minimal' | 'classic';
  showNotificationBadge?: boolean;
  paddingX?: number;
  paddingY?: number;
}

// Create context for widget API client
export const WidgetApiContext = createContext<WidgetApiClient | null>(null);

export function useWidgetApi() {
  const api = useContext(WidgetApiContext);
  if (!api) {
    throw new Error('useWidgetApi must be used within WidgetApiProvider');
  }
  return api;
}

// Widget API Provider Component
function WidgetApiProvider({
  children,
  apiClient
}: {
  children: React.ReactNode;
  apiClient: WidgetApiClient;
}) {
  return (
    <WidgetApiContext.Provider value={apiClient}>
      {children}
    </WidgetApiContext.Provider>
  );
}

// Global initialization function
export function initGithafChat(config: GithafChatConfig) {
  if (!config.backendUrl) {
    console.error('[Githaf Widget] Error: backendUrl is required in config');
    return null;
  }

  // Configure global widget API (used by api.widget.ts)
  const apiClient = createWidgetApi(config.backendUrl);

  // Also configure the global instance for api.widget.ts
  configureWidgetApi(config.backendUrl);

  // Test backend connection
  apiClient.healthCheck()
    .then(() => console.log('✅ [Githaf Widget] Connected to backend:', config.backendUrl))
    .catch((err) => console.warn('⚠️ [Githaf Widget] Backend unreachable:', err.message));

  // Create container div in parent page
  const containerId = 'githaf-chat-widget-root';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = `
      position: fixed;
      ${config.position === 'top-left' ? 'top: ' + (config.paddingY || 20) + 'px; left: ' + (config.paddingX || 20) + 'px;' : ''}
      ${config.position === 'top-right' ? 'top: ' + (config.paddingY || 20) + 'px; right: ' + (config.paddingX || 20) + 'px;' : ''}
      ${config.position === 'bottom-left' ? 'bottom: ' + (config.paddingY || 20) + 'px; left: ' + (config.paddingX || 20) + 'px;' : ''}
      ${!config.position || config.position === 'bottom-right' ? 'bottom: ' + (config.paddingY || 20) + 'px; right: ' + (config.paddingX || 20) + 'px;' : ''}
      z-index: ${config.zIndex || 9999};
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  // Apply custom colors if provided
  if (config.primaryColor) {
    document.documentElement.style.setProperty('--githaf-primary-color', config.primaryColor);
  }
  if (config.accentColor) {
    document.documentElement.style.setProperty('--githaf-accent-color', config.accentColor);
  }

  // Mount ChatWidget component with API provider
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <WidgetApiProvider apiClient={apiClient}>
        <div style={{ pointerEvents: 'auto' }}>
          <ChatWidget adminMode={false} />
        </div>
      </WidgetApiProvider>
    </React.StrictMode>
  );

  console.log('✅ [Githaf Widget] Widget initialized successfully');
  console.log('📍 Position:', config.position || 'bottom-right');
  console.log('🌐 Backend:', config.backendUrl);

  return root;
}

// Auto-initialize if config is present in window
declare global {
  interface Window {
    GithafChatConfig?: GithafChatConfig;
    initGithafChat?: typeof initGithafChat;
  }
}

// Expose function globally
if (typeof window !== 'undefined') {
  window.initGithafChat = initGithafChat;

  // Auto-init if config exists
  if (window.GithafChatConfig) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initGithafChat(window.GithafChatConfig!);
      });
    } else {
      initGithafChat(window.GithafChatConfig);
    }
  }
}
