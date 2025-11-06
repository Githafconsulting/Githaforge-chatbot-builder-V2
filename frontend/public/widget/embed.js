(function() {
  'use strict';

  // Default configuration - matches current ChatWidget design
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

  // Merge user config with defaults
  const config = Object.assign({}, defaultConfig, window.GithafChatConfig || {});

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
    display: none;
    border: none;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    width: 400px;
    height: 600px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
  `;

  // Build iframe URL pointing to dedicated /embed route
  const iframeUrl = new URL(config.apiUrl + '/embed');
  iframeUrl.searchParams.set('primaryColor', config.primaryColor);
  iframeUrl.searchParams.set('accentColor', config.accentColor);
  iframeUrl.searchParams.set('title', config.title);
  iframeUrl.searchParams.set('subtitle', config.subtitle);
  iframeUrl.searchParams.set('greeting', config.greeting);

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
      iframe.style.display = 'block';
      button.innerHTML = closeIcon;
      // Remove badge when opened
      const badge = document.getElementById('githaf-chat-badge');
      if (badge) badge.remove();
    } else {
      iframe.style.display = 'none';
      button.innerHTML = chatIcon;
    }
  });

  // Append elements
  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);

  // Listen for close messages from iframe
  window.addEventListener('message', function(event) {
    if (event.data === 'closeChat') {
      isOpen = false;
      iframe.style.display = 'none';
      button.innerHTML = chatIcon;
    }
  });
})();
