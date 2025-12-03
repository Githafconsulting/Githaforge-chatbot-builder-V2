import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, AlertCircle, Zap } from 'lucide-react';
import { apiService } from '../../services/api';
import type { Chatbot } from '../../types';

/**
 * Standalone test page for chatbot widget
 *
 * This page simulates how the widget will appear on a customer's website.
 * It dynamically loads embed.js with the chatbot configuration.
 *
 * Features:
 * - Shows the floating widget button (not auto-opened)
 * - Fetches latest settings from API on each reload
 * - Simulates a real website environment
 * - LIVE SYNC: Automatically updates when settings are saved in ChatbotDetail
 */
export const ChatbotTestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveSync, setLiveSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const chatbotId = searchParams.get('chatbotId') || '';

  // Fetch latest chatbot settings from API
  const fetchChatbot = useCallback(async () => {
    if (!chatbotId) {
      setError('No chatbot ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getChatbot(chatbotId);
      setChatbot(data);
    } catch (err: any) {
      console.error('Failed to fetch chatbot:', err);
      setError(err.response?.data?.detail || 'Failed to load chatbot settings');
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  // Initial fetch
  useEffect(() => {
    fetchChatbot();
  }, [fetchChatbot]);

  // Live sync via BroadcastChannel - listens for settings updates from ChatbotDetail
  useEffect(() => {
    if (!liveSync || !chatbotId) return;

    // Create broadcast channel for cross-tab communication
    const channel = new BroadcastChannel('chatbot-settings-sync');
    broadcastChannelRef.current = channel;

    channel.onmessage = async (event) => {
      const { type, chatbotId: updatedId, chatbot: updatedChatbot } = event.data;

      // Only update if this is the chatbot we're displaying
      if (type === 'CHATBOT_UPDATED' && updatedId === chatbotId) {
        console.log('[ChatbotTest] Received live update for chatbot:', updatedId);
        setChatbot(updatedChatbot);
        setRefreshKey(prev => prev + 1);
        setLastSyncTime(new Date());
      }
    };

    return () => {
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [liveSync, chatbotId]);

  // Load widget when chatbot data is available
  useEffect(() => {
    if (!chatbot || loading) return;

    // Clean up any existing widget
    const existingContainer = document.getElementById('githaf-chat-widget-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Clean up existing script
    const existingScript = document.getElementById('githaf-embed-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Set the config on window using latest chatbot data
    (window as any).GithafChatConfig = {
      chatbotId: chatbot.id,
      apiUrl: window.location.origin,
      primaryColor: chatbot.primary_color || '#1e40af',
      accentColor: chatbot.secondary_color || '#0ea5e9',
      title: chatbot.widget_title || chatbot.name,
      subtitle: chatbot.widget_subtitle || 'Always here to help',
      greeting: chatbot.greeting_message,
      position: chatbot.widget_position || 'bottom-right',
      buttonSize: chatbot.button_size || 'medium',
      theme: chatbot.widget_theme || 'modern',
      showNotificationBadge: chatbot.show_notification_badge ?? true,
      paddingX: chatbot.padding_x ?? 20,
      paddingY: chatbot.padding_y ?? 20,
      zIndex: chatbot.z_index ?? 9999
    };

    // Load the embed script
    const script = document.createElement('script');
    script.id = 'githaf-embed-script';
    script.src = '/widget/embed.js';
    script.async = true;
    document.body.appendChild(script);

    // Cleanup on unmount or config change
    return () => {
      const container = document.getElementById('githaf-chat-widget-container');
      if (container) {
        container.remove();
      }
      const scriptEl = document.getElementById('githaf-embed-script');
      if (scriptEl) {
        scriptEl.remove();
      }
      delete (window as any).GithafChatConfig;
    };
  }, [chatbot, loading, refreshKey]);

  const handleRefresh = async () => {
    // Fetch fresh data from API and reload widget
    await fetchChatbot();
    setRefreshKey(prev => prev + 1);
  };

  if (loading && !chatbot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading chatbot settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Error Loading Chatbot</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!chatbot) return null;

  const position = chatbot.widget_position || 'bottom-right';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          <div className="px-4 py-1.5 bg-slate-100 rounded-full text-sm text-slate-600 font-mono">
            yourwebsite.com
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Sync Toggle */}
          <button
            onClick={() => setLiveSync(!liveSync)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              liveSync
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            title={liveSync ? 'Live sync enabled - updates automatically when settings are saved' : 'Live sync disabled'}
          >
            <Zap className={`w-4 h-4 ${liveSync ? 'text-green-500' : ''}`} />
            {liveSync ? 'Live Sync ON' : 'Live Sync OFF'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm rounded-lg transition-colors"
            title="Fetch latest settings and reload widget"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Reload Widget'}
          </button>
        </div>
      </div>

      {/* Simulated Website Content */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Welcome to Your Website</h1>
          <p className="text-slate-600 mb-6">
            This is a preview of how your chatbot widget will appear on your website.
            The floating chat button should appear in the <strong>{position.replace('-', ' ')}</strong> corner.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700 mb-1">Chatbot Name</p>
              <p className="text-slate-500">{chatbot.name}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700 mb-1">Theme</p>
              <p className="text-slate-500 capitalize">{chatbot.widget_theme || 'modern'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700 mb-1">Primary Color</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: chatbot.primary_color || '#1e40af' }}></div>
                <p className="text-slate-500 font-mono">{chatbot.primary_color || '#1e40af'}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700 mb-1">Button Size</p>
              <p className="text-slate-500 capitalize">{chatbot.button_size || 'medium'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Sample Content</h2>
          <p className="text-slate-600 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris.
          </p>
          <p className="text-slate-600">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
            fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
          </p>
        </div>

        <div className={`border rounded-xl p-6 text-center ${
          liveSync ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <p className={`font-medium mb-2 ${liveSync ? 'text-green-800' : 'text-slate-700'}`}>
            {liveSync ? '⚡ Live Sync Enabled' : 'Live Preview Mode'}
          </p>
          <ul className={`text-sm space-y-1 ${liveSync ? 'text-green-700' : 'text-slate-600'}`}>
            <li>Click the chat button in the corner to open the widget</li>
            {liveSync ? (
              <>
                <li><strong>Changes will sync automatically</strong> when you save in Chatbot Settings</li>
                {lastSyncTime && (
                  <li className="text-green-600 font-medium">
                    Last synced: {lastSyncTime.toLocaleTimeString()}
                  </li>
                )}
              </>
            ) : (
              <li>Click <strong>"Reload Widget"</strong> to see updates after saving changes</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
