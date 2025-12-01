import React, { useState } from 'react';
import { Bot, Sparkles, Settings } from 'lucide-react';
import { ChatbotsPage } from './Chatbots';
import { ScopesPage } from './Scopes';
import { ChatbotSettings } from './ChatbotSettings';

type TabId = 'chatbots' | 'scopes' | 'config';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: 'chatbots', label: 'My Chatbots', icon: Bot },
  { id: 'scopes', label: 'Scopes', icon: Sparkles },
  { id: 'config', label: 'Configuration', icon: Settings },
];

export const ChatbotsUnifiedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chatbots');

  const renderContent = () => {
    switch (activeTab) {
      case 'chatbots':
        return <ChatbotsPage />;
      case 'scopes':
        return <ScopesPage />;
      case 'config':
        return <ChatbotSettings />;
      default:
        return <ChatbotsPage />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 inline-flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};
