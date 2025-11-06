/**
 * Githaf Chatbot Auto-Updating Embed Script
 *
 * PASTE THIS ONCE - Updates automatically when you change settings in admin panel
 * Uses Server-Sent Events (SSE) for real-time updates - no polling!
 *
 * Usage:
 *   <script src="http://localhost:5173/embed.js"></script>
 */

(function() {
  'use strict';

  // ========== Configuration ==========
  const defaultConfig = {
    apiUrl: 'http://localhost:5173',
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
    paddingY: 20
  };

  // Determine backend API URL
  const API_URL = (window.GithafChatConfig && window.GithafChatConfig.apiUrl) || defaultConfig.apiUrl;
  const API_BASE = `${API_URL}/api/v1`;

  console.log('[Githaf Chatbot] API URL:', API_BASE);


  // ========== State Management ==========
  const state = {
    settings: null,
    version: null,
    eventSource: null,
    retryCount: 0,
    maxRetries: 5,
    widgetContainer: null,
    isOpen: false
  };


  // ========== Settings Cache (localStorage) ==========
  const CACHE_KEY = 'githaf_widget_settings';

  function getCachedSettings() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn('[Githaf Chatbot] Failed to read cache:', e);
      return null;
    }
  }

  function setCachedSettings(settings, version) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        settings,
        version,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('[Githaf Chatbot] Failed to write cache:', e);
    }
  }


  // ========== Field Name Mapping ==========
  function mapBackendToFrontend(backendSettings) {
    return {
      position: backendSettings.widgetPosition || backendSettings.position,
      primaryColor: backendSettings.primaryColor,
      accentColor: backendSettings.accentColor,
      buttonSize: backendSettings.buttonSize,
      greeting: backendSettings.greetingMessage || backendSettings.greeting,
      title: backendSettings.widgetTitle || backendSettings.title,
      subtitle: backendSettings.widgetSubtitle || backendSettings.subtitle,
      zIndex: backendSettings.zIndex,
      theme: backendSettings.widgetTheme || backendSettings.theme,
      showNotificationBadge: backendSettings.showNotificationBadge,
      paddingX: backendSettings.horizontalPadding || backendSettings.paddingX,
      paddingY: backendSettings.verticalPadding || backendSettings.paddingY,
      apiUrl: backendSettings.apiUrl
    };
  }


  // ========== Settings Fetcher ==========
  async function fetchSettings() {
    try {
      console.log('[Githaf Chatbot] Fetching settings from:', `${API_BASE}/widget/`);

      const response = await fetch(`${API_BASE}/widget/`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      // API now returns {settings: {...}, version: "abc123", timestamp: "..."}

      const mappedSettings = mapBackendToFrontend(data.settings);
      state.settings = mappedSettings;
      state.version = data.version;

      // Cache for offline/future loads
      setCachedSettings(mappedSettings, data.version);

      console.log('[Githaf Chatbot] Settings loaded (version:', data.version + ')');

      return mappedSettings;

    } catch (error) {
      console.error('[Githaf Chatbot] Failed to fetch settings:', error);

      // Fallback to cache if available
      const cached = getCachedSettings();
      if (cached) {
        console.log('[Githaf Chatbot] Using cached settings (version:', cached.version + ')');
        state.settings = cached.settings;
        state.version = cached.version;
        return cached.settings;
      }

      // Ultimate fallback to defaults
      return defaultConfig;
    }
  }


  // ========== SSE Connection Manager ==========
  function connectSSE() {
    if (state.eventSource) {
      state.eventSource.close();
    }

    console.log('[Githaf Chatbot] Connecting to SSE stream...');

    const eventSource = new EventSource(`${API_BASE}/widget/events`);
    state.eventSource = eventSource;


    // Connection opened
    eventSource.addEventListener('connected', (e) => {
      console.log('[Githaf Chatbot] SSE connected');
      state.retryCount = 0;  // Reset retry counter on successful connection
    });


    // Settings updated event
    eventSource.addEventListener('settings_updated', async (e) => {
      console.log('[Githaf Chatbot] Settings update notification received');

      try {
        const eventData = JSON.parse(e.data);
        const newVersion = eventData.version;

        console.log('[Githaf Chatbot] Current version:', state.version, '| New version:', newVersion);

        // Check if version actually changed
        if (newVersion !== state.version) {
          console.log('[Githaf Chatbot] New version detected, fetching updated settings...');

          // Fetch updated settings
          const newSettings = await fetchSettings();

          // Re-render widget with new settings
          renderWidget(newSettings);

          console.log('[Githaf Chatbot] Widget updated successfully to version:', state.version);
        } else {
          console.log('[Githaf Chatbot] Version unchanged, skipping update');
        }

      } catch (error) {
        console.error('[Githaf Chatbot] Failed to process settings update:', error);
      }
    });


    // Keepalive ping (prevents timeout)
    eventSource.addEventListener('ping', () => {
      // Silent keepalive
    });


    // Connection error
    eventSource.onerror = (error) => {
      console.warn('[Githaf Chatbot] SSE connection error');

      eventSource.close();

      // Exponential backoff retry
      if (state.retryCount < state.maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, state.retryCount), 30000);
        state.retryCount++;

        console.log(`[Githaf Chatbot] Retrying SSE connection in ${retryDelay}ms (attempt ${state.retryCount}/${state.maxRetries})`);

        setTimeout(() => connectSSE(), retryDelay);
      } else {
        console.error('[Githaf Chatbot] Max SSE retry attempts reached. Widget will use cached settings.');
      }
    };
  }


  // ========== Widget Renderer ==========
  function renderWidget(config) {
    console.log('[Githaf Chatbot] Rendering widget with config:', config);

    // Merge with defaults
    config = Object.assign({}, defaultConfig, config, window.GithafChatConfig || {});

    // Position styles
    const positions = {
      'bottom-right': { bottom: config.paddingY + 'px', right: config.paddingX + 'px' },
      'bottom-left': { bottom: config.paddingY + 'px', left: config.paddingX + 'px' },
      'top-right': { top: config.paddingY + 'px', right: config.paddingX + 'px' },
      'top-left': { top: config.paddingY + 'px', left: config.paddingX + 'px' }
    };

    // Button sizes
    const buttonSizes = {
      small: { width: '50px', height: '50px', iconSize: '20px' },
      medium: { width: '60px', height: '60px', iconSize: '24px' },
      large: { width: '70px', height: '70px', iconSize: '28px' }
    };

    // Theme styles
    const themes = {
      modern: {
        buttonStyle: `
          background: linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor});
          border: none;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        `,
        iconRotate: true,
        showBadge: config.showNotificationBadge
      },
      minimal: {
        buttonStyle: `
          background: ${config.primaryColor};
          border: 2px solid ${config.accentColor};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        `,
        iconRotate: false,
        showBadge: false
      },
      classic: {
        buttonStyle: `
          background: linear-gradient(to bottom, ${config.primaryColor}, ${config.accentColor});
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        `,
        iconRotate: false,
        showBadge: config.showNotificationBadge
      }
    };

    const selectedTheme = themes[config.theme] || themes.modern;

    // Remove old container if it exists
    const oldContainer = document.getElementById('githaf-chat-widget-container');
    if (oldContainer) {
      oldContainer.remove();
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'githaf-chat-widget-container';
    container.style.cssText = `
      position: fixed;
      ${positions[config.position].top ? 'top: ' + positions[config.position].top : ''};
      ${positions[config.position].bottom ? 'bottom: ' + positions[config.position].bottom : ''};
      ${positions[config.position].left ? 'left: ' + positions[config.position].left : ''};
      ${positions[config.position].right ? 'right: ' + positions[config.position].right : ''};
      z-index: ${config.zIndex};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'githaf-chat-widget-iframe';
    iframe.style.cssText = `
      display: ${state.isOpen ? 'block' : 'none'};
      border: none;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 40px);
      transform: translateZ(0);
      -webkit-mask-image: -webkit-radial-gradient(white, black);
      isolation: isolate;
    `;

    // Build iframe URL
    const iframeUrl = new URL(config.apiUrl + '/embed');
    iframeUrl.searchParams.set('primaryColor', config.primaryColor);
    iframeUrl.searchParams.set('accentColor', config.accentColor);
    iframeUrl.searchParams.set('title', config.title);
    iframeUrl.searchParams.set('subtitle', config.subtitle);
    iframeUrl.searchParams.set('greeting', config.greeting);

    if (config.adminPreview === true || config.adminPreview === 'true') {
      iframeUrl.searchParams.set('adminPreview', 'true');
    }

    iframe.src = iframeUrl.toString();

    // Create toggle button
    const button = document.createElement('button');
    button.id = 'githaf-chat-widget-button';
    const btnSize = buttonSizes[config.buttonSize];
    button.style.cssText = `
      width: ${btnSize.width};
      height: ${btnSize.height};
      border-radius: 50%;
      ${selectedTheme.buttonStyle}
      color: white;
      font-size: ${btnSize.iconSize};
      cursor: pointer;
      transition: all 0.3s ease;
      display: ${state.isOpen ? 'none' : 'flex'};
      align-items: center;
      justify-content: center;
      padding: 0;
      position: relative;
    `;

    // Chat icon SVG
    const chatIcon = `
      <svg width="${btnSize.iconSize}" height="${btnSize.iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    button.innerHTML = chatIcon;
    button.setAttribute('aria-label', 'Open chat widget');

    // Add notification badge if theme supports it
    if (selectedTheme.showBadge && !state.isOpen) {
      const badge = document.createElement('div');
      badge.id = 'githaf-chat-badge';
      badge.style.cssText = `
        position: absolute;
        top: -4px;
        right: -4px;
        width: 12px;
        height: 12px;
        background: #ef4444;
        border-radius: 50%;
        border: 2px solid white;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      `;
      button.appendChild(badge);

      // Add pulse animation
      if (!document.getElementById('githaf-pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'githaf-pulse-animation';
        style.textContent = `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Button hover effect
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.1)';
      this.style.borderRadius = '50%';
      if (config.theme === 'modern') {
        this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
      }
    });

    button.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
      this.style.borderRadius = '50%';
      if (config.theme === 'modern') {
        this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
      }
    });

    // Toggle widget
    button.addEventListener('click', function() {
      state.isOpen = true;
      iframe.style.display = 'block';
      button.style.display = 'none';
      // Remove badge when opened
      const badge = document.getElementById('githaf-chat-badge');
      if (badge) badge.remove();
    });

    // Append elements
    container.appendChild(iframe);
    container.appendChild(button);
    document.body.appendChild(container);

    state.widgetContainer = container;

    // Listen for close messages from iframe
    window.addEventListener('message', function(event) {
      if (event.data === 'closeChat' || (event.data && event.data.type === 'closeChat')) {
        state.isOpen = false;
        iframe.style.display = 'none';
        button.style.display = 'flex';
      }
    });

    console.log('[Githaf Chatbot] Widget rendered successfully');
  }


  // ========== Initialization ==========
  async function init() {
    console.log('[Githaf Chatbot] Initializing widget...');

    try {
      // Step 1: Try to load from cache immediately (fast first render)
      const cached = getCachedSettings();
      if (cached) {
        console.log('[Githaf Chatbot] Rendering with cached settings while fetching latest...');
        state.settings = cached.settings;
        state.version = cached.version;
        renderWidget(cached.settings);
      }

      // Step 2: Fetch latest settings from server
      const latestSettings = await fetchSettings();

      // Step 3: Apply settings (will update if different from cache)
      if (!cached || cached.version !== state.version) {
        renderWidget(latestSettings);
      }

      // Step 4: Establish SSE connection for real-time updates
      connectSSE();

      console.log('[Githaf Chatbot] Initialization complete with SSE live updates enabled');

    } catch (error) {
      console.error('[Githaf Chatbot] Initialization failed:', error);
      // Render with defaults as fallback
      renderWidget(defaultConfig);
    }
  }


  // ========== Cleanup on Page Unload ==========
  window.addEventListener('beforeunload', () => {
    if (state.eventSource) {
      state.eventSource.close();
    }
  });


  // ========== Start Widget ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
