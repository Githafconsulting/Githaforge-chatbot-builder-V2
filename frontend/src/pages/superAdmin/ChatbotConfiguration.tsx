import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Brain,
  Sliders,
  Hash,
  Tag,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import type { ChatbotConfig } from '../../types';

type ImplementationStatus = 'working' | 'not_implemented' | 'partial';

interface ConfigSetting {
  key: string;
  label: string;
  description: string;
  status: ImplementationStatus;
  category: 'intent' | 'confidence' | 'rag' | 'llm' | 'topic';
  value?: string | number | boolean;
}

const StatusBadge: React.FC<{ status: ImplementationStatus }> = ({ status }) => {
  switch (status) {
    case 'working':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle className="w-3 h-3" />
          Working
        </span>
      );
    case 'partial':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" />
          Partial
        </span>
      );
    case 'not_implemented':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <XCircle className="w-3 h-3" />
          Not Implemented
        </span>
      );
  }
};

const CategoryIcon: React.FC<{ category: ConfigSetting['category'] }> = ({ category }) => {
  switch (category) {
    case 'intent':
      return <Brain className="w-5 h-5 text-purple-400" />;
    case 'confidence':
      return <Sliders className="w-5 h-5 text-blue-400" />;
    case 'rag':
      return <Hash className="w-5 h-5 text-cyan-400" />;
    case 'llm':
      return <Settings className="w-5 h-5 text-pink-400" />;
    case 'topic':
      return <Tag className="w-5 h-5 text-amber-400" />;
  }
};

export const ChatbotConfiguration: React.FC = () => {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChatbotConfig();
      setConfig(response);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load chatbot configuration');
    } finally {
      setLoading(false);
    }
  };

  // Define all settings with their implementation status
  const settings: ConfigSetting[] = [
    // Intent Configuration
    {
      key: 'intentPatterns',
      label: 'Intent Patterns',
      description: 'Regex patterns for detecting user intents (greeting, farewell, etc.). Currently uses hardcoded patterns in intent_service.py',
      status: 'not_implemented',
      category: 'intent',
      value: config?.intentPatterns ? `${Object.keys(config.intentPatterns).length} intents defined` : 'N/A'
    },
    {
      key: 'intentEnabled',
      label: 'Intent Toggles',
      description: 'Enable/disable specific intent types. Not currently checked by the intent classification system.',
      status: 'not_implemented',
      category: 'intent',
      value: config?.intentEnabled ? `${Object.values(config.intentEnabled).filter(Boolean).length} enabled` : 'N/A'
    },

    // Confidence Thresholds
    {
      key: 'patternConfidenceThreshold',
      label: 'Pattern Confidence Threshold',
      description: 'Minimum confidence for pattern matching. Uses hardcoded 0.75 in intent_service.py',
      status: 'not_implemented',
      category: 'confidence',
      value: config?.patternConfidenceThreshold ?? 0.7
    },
    {
      key: 'llmFallbackEnabled',
      label: 'LLM Fallback Enabled',
      description: 'Use LLM for ambiguous queries. Always enabled (hardcoded True)',
      status: 'not_implemented',
      category: 'confidence',
      value: config?.llmFallbackEnabled ? 'Enabled' : 'Disabled'
    },
    {
      key: 'llmConfidenceThreshold',
      label: 'LLM Confidence Threshold',
      description: 'Minimum confidence for LLM classification. Uses hardcoded 0.6 in intent_service.py',
      status: 'not_implemented',
      category: 'confidence',
      value: config?.llmConfidenceThreshold ?? 0.6
    },

    // RAG Configuration
    {
      key: 'ragTopK',
      label: 'RAG Top K Results',
      description: 'Number of chunks to retrieve. Uses settings.RAG_TOP_K from .env file',
      status: 'not_implemented',
      category: 'rag',
      value: config?.ragTopK ?? 5
    },
    {
      key: 'ragSimilarityThreshold',
      label: 'RAG Similarity Threshold',
      description: 'Minimum cosine similarity. Uses settings.RAG_SIMILARITY_THRESHOLD from .env file',
      status: 'not_implemented',
      category: 'rag',
      value: config?.ragSimilarityThreshold ?? 0.5
    },
    {
      key: 'chunkSize',
      label: 'Chunk Size',
      description: 'Characters per text chunk. Uses settings.CHUNK_SIZE from .env (only affects new uploads)',
      status: 'not_implemented',
      category: 'rag',
      value: config?.chunkSize ?? 500
    },
    {
      key: 'chunkOverlap',
      label: 'Chunk Overlap',
      description: 'Overlap between chunks. Uses settings.CHUNK_OVERLAP from .env (only affects new uploads)',
      status: 'not_implemented',
      category: 'rag',
      value: config?.chunkOverlap ?? 50
    },
    {
      key: 'historyLimit',
      label: 'Conversation History Limit',
      description: 'Number of previous messages included in LLM context. Reads from chatbot_config table.',
      status: 'working',
      category: 'rag',
      value: config?.historyLimit ?? 10
    },

    // LLM Configuration
    {
      key: 'llmModel',
      label: 'LLM Model',
      description: 'Model for response generation. Uses settings.LLM_MODEL from .env file',
      status: 'not_implemented',
      category: 'llm',
      value: config?.llmModel ?? 'llama-3.1-8b-instant'
    },
    {
      key: 'llmTemperature',
      label: 'LLM Temperature',
      description: 'Response creativity (0-2). Uses settings.LLM_TEMPERATURE from .env file',
      status: 'not_implemented',
      category: 'llm',
      value: config?.llmTemperature ?? 0.7
    },
    {
      key: 'llmMaxTokens',
      label: 'LLM Max Tokens',
      description: 'Maximum response length. Uses settings.LLM_MAX_TOKENS from .env file',
      status: 'not_implemented',
      category: 'llm',
      value: config?.llmMaxTokens ?? 500
    },

    // Topic Keywords
    {
      key: 'topicKeywords',
      label: 'Topic Keywords',
      description: 'Keywords for trending query categorization. Uses hardcoded topics in analytics_service.py',
      status: 'not_implemented',
      category: 'topic',
      value: config?.topicKeywords ? `${Object.keys(config.topicKeywords).length} topics defined` : 'N/A'
    },
  ];

  const categories = [
    { id: 'intent', label: 'Intent Detection', icon: Brain, color: 'purple' },
    { id: 'confidence', label: 'Confidence Thresholds', icon: Sliders, color: 'blue' },
    { id: 'rag', label: 'RAG Configuration', icon: Hash, color: 'cyan' },
    { id: 'llm', label: 'LLM Settings', icon: Settings, color: 'pink' },
    { id: 'topic', label: 'Topic Keywords', icon: Tag, color: 'amber' },
  ];

  const workingCount = settings.filter(s => s.status === 'working').length;
  const notImplementedCount = settings.filter(s => s.status === 'not_implemented').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Chatbot Configuration</h1>
          <p className="text-slate-400">Platform-wide chatbot settings and their implementation status</p>
        </div>
        <button
          onClick={fetchConfig}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Working</p>
              <p className="text-2xl font-bold text-white">{workingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Not Implemented</p>
              <p className="text-2xl font-bold text-white">{notImplementedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Settings</p>
              <p className="text-2xl font-bold text-white">{settings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium">Implementation Status</p>
            <p className="text-sm text-amber-200/70 mt-1">
              Most settings are stored in the database but not yet wired to the backend services.
              They currently use hardcoded values or read from environment variables (.env file).
              Only <strong>Conversation History Limit</strong> is fully implemented.
            </p>
          </div>
        </div>
      </div>

      {/* Settings by Category */}
      {categories.map((category) => {
        const categorySettings = settings.filter(s => s.category === category.id);
        const Icon = category.icon;

        return (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
          >
            <div className={`px-6 py-4 border-b border-slate-700 bg-${category.color}-500/5`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${category.color}-500/20 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${category.color}-400`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{category.label}</h2>
                  <p className="text-sm text-slate-400">{categorySettings.length} settings</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-700">
              {categorySettings.map((setting) => (
                <div key={setting.key} className="px-6 py-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-white">{setting.label}</h3>
                        <StatusBadge status={setting.status} />
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{setting.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Current Value:</span>
                        <code className="text-xs bg-slate-900 px-2 py-1 rounded text-cyan-400">
                          {String(setting.value)}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Future Work Note */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-3">Next Steps to Wire Up Settings</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">1.</span>
            <span><strong>Intent Patterns:</strong> Modify intent_service.py to read patterns from DB instead of INTENT_PATTERNS constant</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">2.</span>
            <span><strong>Confidence Thresholds:</strong> Pass thresholds from DB to classify_intent_hybrid() function</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">3.</span>
            <span><strong>RAG Settings:</strong> Read from chatbot_config instead of settings.py/env vars</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">4.</span>
            <span><strong>LLM Settings:</strong> Pass model/temp/tokens from DB to llm_service.py</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">5.</span>
            <span><strong>Topic Keywords:</strong> Read from chatbot_config in analytics_service.py</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
