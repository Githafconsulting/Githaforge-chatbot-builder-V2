import React, { useEffect, useMemo } from 'react';
import { ChatWidget } from '../components/chat/ChatWidget';

/**
 * Dedicated embed page for the chatbot widget
 * This page contains ONLY the ChatWidget component
 * Used when embedding on external websites via iframe
 *
 * Required URL params:
 * - chatbotId: UUID of the chatbot to use
 *
 * Optional URL params:
 * - primaryColor: Hex color for primary theme
 * - accentColor: Hex color for accent theme
 * - title: Widget title
 * - subtitle: Widget subtitle
 * - greeting: Initial greeting message
 * - adminPreview: Set to 'true' to enable admin mode (shows sources)
 * - backendUrl: Backend API URL (for tunneling/remote deployments)
 */
export const EmbedPage: React.FC = () => {
  // Parse URL params once and memoize to prevent re-renders
  const widgetConfig = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      title: params.get('title') || '',
      subtitle: params.get('subtitle') || '',
      greeting: params.get('greeting') || '',
      adminMode: params.get('adminPreview') === 'true',
      chatbotId: params.get('chatbotId') || '',
      backendUrl: params.get('backendUrl')?.trim() || '',
      primaryColor: params.get('primaryColor'),
      accentColor: params.get('accentColor')
    };
  }, []); // Empty deps - URL params don't change

  // Apply color customization in background (non-blocking)
  useEffect(() => {
    if (widgetConfig.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', widgetConfig.primaryColor);
    }
    if (widgetConfig.accentColor) {
      document.documentElement.style.setProperty('--accent-color', widgetConfig.accentColor);
    }
  }, [widgetConfig.primaryColor, widgetConfig.accentColor]);

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
        chatbotId={widgetConfig.chatbotId}
        backendUrl={widgetConfig.backendUrl}
      />

      <style>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        /* Prevent iOS zoom on input focus */
        input, textarea {
          font-size: 16px !important;
        }
      `}</style>
    </div>
  );
};
