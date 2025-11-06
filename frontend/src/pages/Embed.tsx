import React, { useEffect, useState } from 'react';
import { ChatWidget } from '../components/chat/ChatWidget';

/**
 * Dedicated embed page for the chatbot widget
 * This page contains ONLY the ChatWidget component
 * Used when embedding on external websites via iframe
 */
export const EmbedPage: React.FC = () => {
  const [widgetConfig, setWidgetConfig] = useState({
    title: '',
    subtitle: '',
    greeting: '',
    adminMode: false
  });

  useEffect(() => {
    // Apply any customization from URL params
    const params = new URLSearchParams(window.location.search);
    const primaryColor = params.get('primaryColor');
    const accentColor = params.get('accentColor');
    const title = params.get('title');
    const subtitle = params.get('subtitle');
    const greeting = params.get('greeting');
    const adminPreview = params.get('adminPreview');

    if (primaryColor) {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
    }
    if (accentColor) {
      document.documentElement.style.setProperty('--accent-color', accentColor);
    }

    // Store content params for ChatWidget
    setWidgetConfig({
      title: title || '',
      subtitle: subtitle || '',
      greeting: greeting || '',
      adminMode: adminPreview === 'true' // Enable admin mode (sources display) when in admin panel preview
    });

    // Notify parent that embed is loaded
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'githaf-chat-loaded' }, '*');
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/*
        ChatWidget rendered in embed mode
        embedMode={true} means:
        - Chat window auto-opens (no toggle button needed)
        - Takes full width/height of iframe
        - Has rounded corners that will be clipped by iframe overflow:hidden
      */}
      <ChatWidget
        adminMode={widgetConfig.adminMode}
        embedMode={true}
        titleOverride={widgetConfig.title}
        subtitleOverride={widgetConfig.subtitle}
        greetingOverride={widgetConfig.greeting}
      />

      {/* Optional: Background styling */}
      <style>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
