import React, { useState } from 'react';
import { Building2, Settings } from 'lucide-react';
import { CompanySettingsPage } from './CompanySettings';
import { SystemSettingsPage } from './SystemSettings';

type TabId = 'company' | 'system';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: 'company', label: 'Company Settings', icon: Building2 },
  { id: 'system', label: 'System Settings', icon: Settings },
];

export const SettingsUnifiedPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('company');

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanySettingsPage />;
      case 'system':
        return <SystemSettingsPage />;
      default:
        return <CompanySettingsPage />;
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
