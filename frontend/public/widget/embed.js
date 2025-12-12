(function() {
  'use strict';

  // ============================================================================
  // SIMPLIFIED EMBED ARCHITECTURE (Klaviyo-style)
  // ============================================================================
  //
  // Usage: Single script tag with data-chatbot-id attribute
  // <script src="https://yourdomain.com/widget/embed.js" data-chatbot-id="xxx"></script>
  //
  // The script automatically:
  // 1. Detects its own URL to determine the backend/frontend base URLs
  // 2. Fetches widget configuration from the backend API
  // 3. Preloads the iframe in background for instant opening
  // 4. Renders the widget with the fetched settings
  //
  // No window.GithafChatConfig needed - all settings come from the database!
  // ============================================================================

  // Get the script element and extract chatbot ID
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const chatbotId = currentScript.getAttribute('data-chatbot-id');

  // Derive base URLs from script source
  // Example: https://myapp.trycloudflare.com/widget/embed.js
  // Backend URL: https://myapp.trycloudflare.com (or separate backend if configured)
  const scriptSrc = currentScript.src;
  const scriptUrl = new URL(scriptSrc);

  // The frontend URL is where the script is hosted
  const frontendBaseUrl = `${scriptUrl.protocol}//${scriptUrl.host}`;

  // Check for optional data attributes for backend URL override
  // This allows deployment where frontend and backend are on different domains
  const backendBaseUrl = currentScript.getAttribute('data-backend-url') || frontendBaseUrl;

  // Legacy support: Also check window.GithafChatConfig for override
  const legacyConfig = window.GithafChatConfig || {};
  const effectiveBackendUrl = legacyConfig.backendUrl || backendBaseUrl;
  const effectiveFrontendUrl = legacyConfig.apiUrl || frontendBaseUrl;

  // Track iframe loading state
  let iframeLoaded = false;

  // Default fallback configuration (used if API call fails)
  const defaultConfig = {
    position: 'bottom-right',
    primaryColor: '#1e40af',
    accentColor: '#0ea5e9',
    buttonSize: 'medium',
    greeting: 'Hi! How can I help you today?',
    title: 'Chat with us',
    subtitle: 'We\'re here to help',
    zIndex: 9999,
    theme: 'modern',
    showNotificationBadge: true,
    paddingX: 20,
    paddingY: 20
  };

  // Fetch widget configuration from backend
  async function fetchWidgetConfig() {
    if (!chatbotId) {
      console.warn('[Githaf Chat] No data-chatbot-id attribute found on script tag');
      return { ...defaultConfig, is_active: true, deploy_status: 'deployed' };
    }

    try {
      const response = await fetch(`${effectiveBackendUrl}/api/v1/chatbots/${chatbotId}/widget-config`);

      if (!response.ok) {
        console.error('[Githaf Chat] Failed to fetch widget config:', response.status);
        return { ...defaultConfig, is_active: true, deploy_status: 'deployed' };
      }

      const data = await response.json();

      // Map API response to config format
      return {
        chatbotId: data.chatbot_id,
        is_active: data.is_active !== false,
        deploy_status: data.deploy_status || 'deployed',
        paused_message: data.paused_message,
        position: data.widget_position || defaultConfig.position,
        primaryColor: data.primary_color || defaultConfig.primaryColor,
        accentColor: data.secondary_color || defaultConfig.accentColor,
        buttonSize: data.button_size || defaultConfig.buttonSize,
        greeting: data.greeting_message || defaultConfig.greeting,
        title: data.widget_title || defaultConfig.title,
        subtitle: data.widget_subtitle || defaultConfig.subtitle,
        zIndex: data.z_index || defaultConfig.zIndex,
        theme: data.widget_theme || defaultConfig.theme,
        showNotificationBadge: data.show_notification_badge !== false,
        paddingX: data.padding_x || defaultConfig.paddingX,
        paddingY: data.padding_y || defaultConfig.paddingY,
        logoUrl: data.logo_url
      };
    } catch (error) {
      console.error('[Githaf Chat] Error fetching widget config:', error);
      return { ...defaultConfig, is_active: true, deploy_status: 'deployed' };
    }
  }

  // Initialize widget after fetching config
  async function initWidget() {
    const config = await fetchWidgetConfig();

    // Don't render widget if chatbot is hidden (is_active = false)
    if (!config.is_active) {
      console.log('[Githaf Chat] Chatbot is hidden (is_active=false), not rendering widget');
      return;
    }

    renderWidget(config);
  }

  function renderWidget(config) {
    // Position styles - use custom padding
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
    const positionStyle = positions[config.position] || positions['bottom-right'];

    // Create container
    const container = document.createElement('div');
    container.id = 'githaf-chat-widget-container';
    container.style.cssText = `
      position: fixed;
      ${positionStyle.top ? 'top: ' + positionStyle.top : ''};
      ${positionStyle.bottom ? 'bottom: ' + positionStyle.bottom : ''};
      ${positionStyle.left ? 'left: ' + positionStyle.left : ''};
      ${positionStyle.right ? 'right: ' + positionStyle.right : ''};
      z-index: ${config.zIndex};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create skeleton loader (shown while iframe loads)
    const skeleton = document.createElement('div');
    skeleton.id = 'githaf-chat-skeleton';
    skeleton.style.cssText = `
      display: none;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 40px);
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      background: #1e293b;
      overflow: hidden;
    `;
    skeleton.innerHTML = `
      <div style="background: linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor}); padding: 20px; display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%;"></div>
        <div>
          <div style="width: 120px; height: 16px; background: rgba(255,255,255,0.3); border-radius: 4px; margin-bottom: 6px;"></div>
          <div style="width: 80px; height: 12px; background: rgba(255,255,255,0.2); border-radius: 4px;"></div>
        </div>
      </div>
      <div style="padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100% - 140px);">
        <div style="width: 48px; height: 48px; border: 3px solid ${config.primaryColor}; border-top-color: transparent; border-radius: 50%; animation: githaf-spin 1s linear infinite;"></div>
        <div style="margin-top: 16px; color: #94a3b8; font-size: 14px;">Loading chat...</div>
      </div>
      <style>
        @keyframes githaf-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    // Create iframe (preloaded but hidden)
    const iframe = document.createElement('iframe');
    iframe.id = 'githaf-chat-widget-iframe';
    iframe.style.cssText = `
      display: none;
      border: none;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 40px);
    `;

    // Build iframe URL pointing to dedicated /embed route on the FRONTEND
    const iframeUrl = new URL(effectiveFrontendUrl + '/embed');

    // Pass chatbotId to iframe so it uses the correct chatbot's knowledge base
    if (config.chatbotId || chatbotId) {
      iframeUrl.searchParams.set('chatbotId', config.chatbotId || chatbotId);
    }

    // Pass appearance settings to iframe for initial render
    // (the iframe can also fetch from API, but this provides faster initial paint)
    iframeUrl.searchParams.set('primaryColor', config.primaryColor);
    iframeUrl.searchParams.set('accentColor', config.accentColor);
    iframeUrl.searchParams.set('title', config.title);
    iframeUrl.searchParams.set('subtitle', config.subtitle);
    iframeUrl.searchParams.set('greeting', config.greeting);

    // Pass backend URL so iframe knows where to send chat messages
    iframeUrl.searchParams.set('backendUrl', effectiveBackendUrl);

    // Mark iframe as loaded when it signals ready
    iframe.onload = function() {
      // Basic load event - iframe HTML loaded but React may still be hydrating
    };

    iframe.src = iframeUrl.toString();

    // Create toggle button
    const button = document.createElement('button');
    button.id = 'githaf-chat-widget-button';
    const btnSize = buttonSizes[config.buttonSize] || buttonSizes.medium;
    button.style.cssText = `
      width: ${btnSize.width};
      height: ${btnSize.height};
      border-radius: 50%;
      ${selectedTheme.buttonStyle}
      color: white;
      font-size: ${btnSize.iconSize};
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
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

    // Close icon SVG
    const closeIcon = `
      <svg width="${btnSize.iconSize}" height="${btnSize.iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    button.innerHTML = chatIcon;
    button.setAttribute('aria-label', 'Open chat widget');

    // Add notification badge if theme supports it
    if (selectedTheme.showBadge) {
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
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add icon rotation animation for modern theme (on hover only)
    if (selectedTheme.iconRotate) {
      let rotationInterval = null;

      const startRotation = () => {
        // Clear any existing interval first
        if (rotationInterval) {
          clearInterval(rotationInterval);
        }

        let rotation = 0;
        rotationInterval = setInterval(() => {
          rotation += 2; // Rotate 2 degrees per frame for smoother animation
          const icon = button.querySelector('svg');
          if (icon && !isOpen) { // Only rotate when closed
            icon.style.transform = `rotate(${rotation}deg)`;
            icon.style.transition = 'none'; // Disable transition for smooth continuous rotation
          }
        }, 16); // ~60fps
      };

      const stopRotation = () => {
        if (rotationInterval) {
          clearInterval(rotationInterval);
          rotationInterval = null;
        }
        const icon = button.querySelector('svg');
        if (icon) {
          icon.style.transition = 'transform 0.3s ease';
          icon.style.transform = 'rotate(0deg)';
        }
      };

      // Rotate on hover only
      button.addEventListener('mouseenter', startRotation);
      button.addEventListener('mouseleave', stopRotation);

      // Stop rotation when widget is opened
      button.addEventListener('click', () => {
        if (isOpen) {
          stopRotation();
        }
      });
    }

    // Button hover effect
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.1)';
      if (config.theme === 'modern') {
        this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
      }
    });

    button.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
      if (config.theme === 'modern') {
        this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
      }
    });

    // Toggle widget
    let isOpen = false;
    button.addEventListener('click', function() {
      isOpen = !isOpen;
      if (isOpen) {
        button.style.display = 'none'; // Hide button when chat is open - use X in chat header to close
        // Remove badge when opened
        const badge = document.getElementById('githaf-chat-badge');
        if (badge) badge.remove();

        // Show iframe if loaded, otherwise show skeleton
        if (iframeLoaded) {
          iframe.style.display = 'block';
          skeleton.style.display = 'none';
        } else {
          skeleton.style.display = 'block';
          iframe.style.display = 'none';
        }
      } else {
        iframe.style.display = 'none';
        skeleton.style.display = 'none';
        button.style.display = 'flex';
        button.innerHTML = chatIcon;
      }
    });

    // Append elements
    container.appendChild(skeleton);
    container.appendChild(iframe);
    container.appendChild(button);
    document.body.appendChild(container);

    // Function to switch from skeleton to iframe
    const showIframe = () => {
      iframeLoaded = true;
      if (isOpen) {
        skeleton.style.display = 'none';
        iframe.style.display = 'block';
      }
    };

    // Listen for messages from iframe
    window.addEventListener('message', function(event) {
      // Handle iframe ready message (React app fully loaded)
      if (event.data && event.data.type === 'githaf-chat-loaded') {
        showIframe();
      }

      // Handle close chat message
      if (event.data === 'closeChat' || (event.data && event.data.type === 'closeChat')) {
        isOpen = false;
        iframe.style.display = 'none';
        skeleton.style.display = 'none';
        button.style.display = 'flex'; // Show button again
        button.innerHTML = chatIcon;
      }
    });

    // Fallback: Also listen for iframe's native load event
    // This fires when HTML is loaded (React may still be hydrating)
    iframe.addEventListener('load', function() {
      // Give React a moment to hydrate, then show iframe
      setTimeout(() => {
        if (!iframeLoaded) {
          console.log('[Githaf Chat] Iframe loaded via fallback');
          showIframe();
        }
      }, 500);
    });

    // Ultimate fallback: If nothing works after 5 seconds, show iframe anyway
    setTimeout(() => {
      if (!iframeLoaded) {
        console.log('[Githaf Chat] Iframe loaded via timeout fallback');
        showIframe();
      }
    }, 5000);
  } // End of renderWidget function

  // Start widget initialization
  initWidget();
})();
