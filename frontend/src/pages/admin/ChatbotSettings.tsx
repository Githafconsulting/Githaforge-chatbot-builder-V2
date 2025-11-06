import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Save, RotateCcw, AlertCircle, Settings, Sliders, Brain, Hash, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import type { ChatbotConfig } from '../../types';

export const ChatbotSettings: React.FC = () => {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'intents' | 'confidence' | 'rag' | 'llm' | 'topics'>('intents');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await apiService.getChatbotConfig();
      console.log('📥 Loaded chatbot config:', data);
      console.log('📊 Intent patterns count:', Object.keys(data.intentPatterns || {}).length);
      Object.entries(data.intentPatterns || {}).forEach(([intent, patterns]) => {
        console.log(`  - ${intent}: ${Array.isArray(patterns) ? patterns.length : 0} patterns`);
      });
      setConfig(data);
    } catch (error) {
      console.error('Failed to load chatbot config:', error);
      toast.error('Failed to load chatbot configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await apiService.updateChatbotConfig(config);
      toast.success('Chatbot configuration saved successfully!');
      await loadConfig(); // Reload to get updated timestamps
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all chatbot configuration to defaults? This cannot be undone.')) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiService.resetChatbotConfig();
      setConfig(response.config);
      toast.success('Configuration reset to defaults');
    } catch (error) {
      console.error('Failed to reset config:', error);
      toast.error('Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<ChatbotConfig>) => {
    setConfig(prev => prev ? { ...prev, ...updates } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-slate-300">Failed to load configuration</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'intents' as const, label: 'Intent Patterns', icon: Bot },
    { id: 'confidence' as const, label: 'Confidence Thresholds', icon: Sliders },
    { id: 'rag' as const, label: 'RAG Configuration', icon: Brain },
    { id: 'llm' as const, label: 'LLM Settings', icon: Settings },
    { id: 'topics' as const, label: 'Topic Keywords', icon: Tag },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Chatbot Configuration</h1>
            <p className="text-slate-400 text-sm">Manage intents, confidence levels, and behavior</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'intents' && (
          <IntentPatternsTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'confidence' && (
          <ConfidenceTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'rag' && (
          <RAGTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'llm' && (
          <LLMTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'topics' && (
          <TopicsTab config={config} updateConfig={updateConfig} />
        )}
      </motion.div>
    </div>
  );
};

// Intent Patterns Tab
const IntentPatternsTab: React.FC<{ config: ChatbotConfig; updateConfig: (updates: Partial<ChatbotConfig>) => void }> = ({ config, updateConfig }) => {
  const intents = ['greeting', 'farewell', 'gratitude', 'help', 'chit_chat'];

  // Ensure intentPatterns and intentEnabled exist
  const intentPatterns = config.intentPatterns || {};
  const intentEnabled = config.intentEnabled || {};

  const toggleIntent = (intent: string) => {
    updateConfig({
      intentEnabled: {
        ...intentEnabled,
        [intent]: !intentEnabled[intent],
      },
    });
  };

  const addPattern = (intent: string) => {
    const pattern = prompt(`Add new regex pattern for ${intent}:`);
    if (pattern) {
      updateConfig({
        intentPatterns: {
          ...intentPatterns,
          [intent]: [...(intentPatterns[intent] || []), pattern],
        },
      });
    }
  };

  const removePattern = (intent: string, index: number) => {
    const patterns = [...(intentPatterns[intent] || [])];
    patterns.splice(index, 1);
    updateConfig({
      intentPatterns: {
        ...intentPatterns,
        [intent]: patterns,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>Intent Patterns:</strong> Regular expressions used to detect user intent. Enable/disable specific intents or add custom patterns.
        </p>
      </div>

      {intents.map((intent) => (
        <div key={intent} className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-50 capitalize">{intent.replace('_', ' ')}</h3>
              <span className="text-xs text-slate-400">
                {intentPatterns[intent]?.length || 0} patterns
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => addPattern(intent)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add Pattern
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={intentEnabled[intent] ?? true}
                  onChange={() => toggleIntent(intent)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {intentPatterns[intent] && intentPatterns[intent].length > 0 ? (
            <div className="space-y-2">
              {intentPatterns[intent].map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded p-3">
                  <code className="text-sm text-slate-300 font-mono">{pattern}</code>
                  <button
                    onClick={() => removePattern(intent, idx)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm italic">No patterns defined</p>
          )}
        </div>
      ))}
    </div>
  );
};

// Confidence Tab
const ConfidenceTab: React.FC<{ config: ChatbotConfig; updateConfig: (updates: Partial<ChatbotConfig>) => void }> = ({ config, updateConfig }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>Confidence Thresholds:</strong> Minimum confidence scores required for pattern matching and LLM classification.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Pattern Confidence */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-slate-50 font-medium">Pattern Matching Confidence</label>
            <span className="text-blue-400 font-mono">{(config.patternConfidenceThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={config.patternConfidenceThreshold * 100}
            onChange={(e) => updateConfig({ patternConfidenceThreshold: parseInt(e.target.value) / 100 })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">Minimum confidence for regex pattern matching (0-100%)</p>
        </div>

        {/* LLM Fallback */}
        <div className="border-t border-slate-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-slate-50 font-medium">LLM Fallback</h3>
              <p className="text-sm text-slate-400">Use LLM for ambiguous queries when patterns don't match</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.llmFallbackEnabled}
                onChange={(e) => updateConfig({ llmFallbackEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {config.llmFallbackEnabled && (
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-slate-50 font-medium">LLM Classification Confidence</label>
                <span className="text-blue-400 font-mono">{(config.llmConfidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.llmConfidenceThreshold * 100}
                onChange={(e) => updateConfig({ llmConfidenceThreshold: parseInt(e.target.value) / 100 })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Minimum confidence for LLM intent classification (0-100%)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// RAG Tab
const RAGTab: React.FC<{ config: ChatbotConfig; updateConfig: (updates: Partial<ChatbotConfig>) => void }> = ({ config, updateConfig }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>RAG Configuration:</strong> Settings for Retrieval-Augmented Generation including vector search and text chunking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top K */}
        <div className="card p-6">
          <label className="text-slate-50 font-medium block mb-3">Top K Results</label>
          <input
            type="number"
            min="1"
            max="20"
            value={config.ragTopK}
            onChange={(e) => updateConfig({ ragTopK: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">Number of document chunks to retrieve (1-20)</p>
        </div>

        {/* Similarity Threshold */}
        <div className="card p-6">
          <div className="flex justify-between mb-3">
            <label className="text-slate-50 font-medium">Similarity Threshold</label>
            <span className="text-blue-400 font-mono">{(config.ragSimilarityThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={config.ragSimilarityThreshold * 100}
            onChange={(e) => updateConfig({ ragSimilarityThreshold: parseInt(e.target.value) / 100 })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">Minimum cosine similarity score (0-100%)</p>
        </div>

        {/* Chunk Size */}
        <div className="card p-6">
          <label className="text-slate-50 font-medium block mb-3">Chunk Size</label>
          <input
            type="number"
            min="100"
            max="2000"
            step="50"
            value={config.chunkSize}
            onChange={(e) => updateConfig({ chunkSize: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">Characters per text chunk (100-2000)</p>
        </div>

        {/* Chunk Overlap */}
        <div className="card p-6">
          <label className="text-slate-50 font-medium block mb-3">Chunk Overlap</label>
          <input
            type="number"
            min="0"
            max="500"
            step="10"
            value={config.chunkOverlap}
            onChange={(e) => updateConfig({ chunkOverlap: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">Overlap between consecutive chunks (0-500)</p>
        </div>
      </div>
    </div>
  );
};

// LLM Tab
const LLMTab: React.FC<{ config: ChatbotConfig; updateConfig: (updates: Partial<ChatbotConfig>) => void }> = ({ config, updateConfig }) => {
  // Ensure all LLM config properties have safe defaults
  const llmModel = config.llmModel || 'llama-3.1-8b-instant';
  const llmMaxTokens = config.llmMaxTokens ?? 500;
  const llmTemperature = config.llmTemperature ?? 0.7;

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>LLM Settings:</strong> Configure the language model parameters for response generation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model */}
        <div className="card p-6">
          <label className="text-slate-50 font-medium block mb-3">LLM Model</label>
          <input
            type="text"
            value={llmModel}
            onChange={(e) => updateConfig({ llmModel: e.target.value })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">Groq model name (e.g., llama-3.1-8b-instant)</p>
        </div>

        {/* Max Tokens */}
        <div className="card p-6">
          <label className="text-slate-50 font-medium block mb-3">Max Tokens</label>
          <input
            type="number"
            min="50"
            max="2000"
            step="50"
            value={llmMaxTokens}
            onChange={(e) => updateConfig({ llmMaxTokens: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-50 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-2">Maximum response length (50-2000)</p>
        </div>

        {/* Temperature */}
        <div className="card p-6 md:col-span-2">
          <div className="flex justify-between mb-3">
            <label className="text-slate-50 font-medium">Temperature</label>
            <span className="text-blue-400 font-mono">{llmTemperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={llmTemperature * 100}
            onChange={(e) => updateConfig({ llmTemperature: parseInt(e.target.value) / 100 })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>0.0 (Deterministic)</span>
            <span>1.0 (Balanced)</span>
            <span>2.0 (Creative)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Topics Tab
const TopicsTab: React.FC<{ config: ChatbotConfig; updateConfig: (updates: Partial<ChatbotConfig>) => void }> = ({ config, updateConfig }) => {
  const topicKeywords = config.topicKeywords || {};
  const topics = Object.keys(topicKeywords);

  const addKeyword = (topic: string) => {
    const keyword = prompt(`Add keyword for ${topic}:`);
    if (keyword) {
      updateConfig({
        topicKeywords: {
          ...topicKeywords,
          [topic]: [...(topicKeywords[topic] || []), keyword.toLowerCase()],
        },
      });
    }
  };

  const removeKeyword = (topic: string, index: number) => {
    const keywords = [...(topicKeywords[topic] || [])];
    keywords.splice(index, 1);
    updateConfig({
      topicKeywords: {
        ...topicKeywords,
        [topic]: keywords,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>Topic Keywords:</strong> Keywords used to categorize trending queries by topic. Add keywords that help identify each category.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topics.length > 0 ? topics.map((topic) => (
          <div key={topic} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-50 capitalize">{topic.replace('_', ' ')}</h3>
              <button
                onClick={() => addKeyword(topic)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {topicKeywords[topic]?.map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300"
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(topic, idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {(!topicKeywords[topic] || topicKeywords[topic].length === 0) && (
              <p className="text-slate-400 text-sm italic">No keywords defined</p>
            )}
          </div>
        )) : (
          <div className="col-span-2 text-center text-slate-400 py-8">
            <p>No topic keywords configured. Save to initialize default topics.</p>
          </div>
        )}
      </div>
    </div>
  );
};
