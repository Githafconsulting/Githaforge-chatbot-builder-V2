import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  BarChart3,
  Settings,
  Code,
  MessageSquare,
  TrendingUp,
  Users,
  ThumbsUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import type { Chatbot, ChatbotUpdate, ChatbotStats, ChatbotWithEmbedCode } from '../../types';

export const ChatbotDetailPage: React.FC = () => {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [embedCode, setEmbedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'embed'>('settings');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (chatbotId) {
      loadChatbot();
      loadStats();
      loadEmbedCode();
    }
  }, [chatbotId]);

  const loadChatbot = async () => {
    try {
      setLoading(true);
      const data = await apiService.getChatbot(chatbotId!);
      setChatbot(data);
    } catch (error) {
      console.error('Failed to load chatbot:', error);
      toast.error('Failed to load chatbot');
      navigate('/admin/chatbots');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiService.getChatbotStats(chatbotId!);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadEmbedCode = async () => {
    try {
      const data = await apiService.getChatbotWithEmbedCode(chatbotId!);
      setEmbedCode(data.embed_code);
    } catch (error) {
      console.error('Failed to load embed code:', error);
    }
  };

  const handleSave = async () => {
    if (!chatbot) return;

    try {
      setSaving(true);
      const updates: ChatbotUpdate = {
        name: chatbot.name,
        description: chatbot.description,
        greeting_message: chatbot.greeting_message,
        primary_color: chatbot.primary_color,
        secondary_color: chatbot.secondary_color,
        model_preset: chatbot.model_preset,
        temperature: chatbot.temperature,
        max_tokens: chatbot.max_tokens,
        top_k: chatbot.top_k,
        similarity_threshold: chatbot.similarity_threshold,
        allowed_domains: chatbot.allowed_domains,
        rate_limit_per_ip: chatbot.rate_limit_per_ip,
      };
      const updated = await apiService.updateChatbot(chatbot.id, updates);
      setChatbot(updated);
      toast.success('Chatbot updated successfully!');
    } catch (error: any) {
      console.error('Failed to update chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to update chatbot');
    } finally {
      setSaving(false);
    }
  };

  const handleDeploy = async () => {
    if (!chatbot) return;

    try {
      const updated = await apiService.deployChatbot(chatbot.id);
      setChatbot(updated);
      toast.success('Chatbot deployed successfully!');
    } catch (error: any) {
      console.error('Failed to deploy chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to deploy chatbot');
    }
  };

  const handlePause = async () => {
    if (!chatbot) return;

    try {
      const updated = await apiService.pauseChatbot(chatbot.id);
      setChatbot(updated);
      toast.success('Chatbot paused successfully!');
    } catch (error: any) {
      console.error('Failed to pause chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to pause chatbot');
    }
  };

  const handleDelete = async () => {
    if (!chatbot) return;

    if (!confirm(`Are you sure you want to delete "${chatbot.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteChatbot(chatbot.id);
      toast.success('Chatbot deleted successfully!');
      navigate('/admin/chatbots');
    } catch (error: any) {
      console.error('Failed to delete chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete chatbot');
    }
  };

  const handleCopyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-slate-300">Chatbot not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/chatbots')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{chatbot.name}</h1>
            <p className="text-slate-400 mt-1">
              {chatbot.description || 'No description'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chatbot.deploy_status === 'deployed' ? (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : (
            <button
              onClick={handleDeploy}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Deploy
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Settings
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'embed'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Code className="w-4 h-4 inline mr-2" />
          Embed Code
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'settings' && (
          <SettingsTab
            chatbot={chatbot}
            setChatbot={setChatbot}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab stats={stats} />
        )}
        {activeTab === 'embed' && (
          <EmbedTab
            embedCode={embedCode}
            onCopy={handleCopyEmbedCode}
            copied={copied}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Settings Tab Component
interface SettingsTabProps {
  chatbot: Chatbot;
  setChatbot: (chatbot: Chatbot) => void;
  onSave: () => void;
  saving: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ chatbot, setChatbot, onSave, saving }) => {
  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input
            type="text"
            value={chatbot.name}
            onChange={(e) => setChatbot({ ...chatbot, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <textarea
            value={chatbot.description || ''}
            onChange={(e) => setChatbot({ ...chatbot, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Greeting Message</label>
          <input
            type="text"
            value={chatbot.greeting_message}
            onChange={(e) => setChatbot({ ...chatbot, greeting_message: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Primary Color</label>
            <input
              type="color"
              value={chatbot.primary_color || '#1E40AF'}
              onChange={(e) => setChatbot({ ...chatbot, primary_color: e.target.value })}
              className="w-full h-10 px-2 bg-slate-900 border border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Secondary Color</label>
            <input
              type="color"
              value={chatbot.secondary_color || '#3B82F6'}
              onChange={(e) => setChatbot({ ...chatbot, secondary_color: e.target.value })}
              className="w-full h-10 px-2 bg-slate-900 border border-slate-700 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Model Preset</label>
          <select
            value={chatbot.model_preset}
            onChange={(e) => setChatbot({ ...chatbot, model_preset: e.target.value as 'fast' | 'balanced' | 'accurate' })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="fast">Fast (Quick responses)</option>
            <option value="balanced">Balanced (Recommended)</option>
            <option value="accurate">Accurate (High quality)</option>
          </select>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Analytics Tab Component
interface AnalyticsTabProps {
  stats: ChatbotStats | null;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ stats }) => {
  if (!stats) {
    return (
      <motion.div
        key="analytics"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex items-center justify-center min-h-[300px]"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total Conversations"
          value={stats.total_conversations.toLocaleString()}
          color="text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Messages"
          value={stats.total_messages.toLocaleString()}
          color="text-green-400"
        />
        <StatCard
          icon={ThumbsUp}
          label="Satisfaction Rate"
          value={stats.avg_satisfaction ? `${(stats.avg_satisfaction * 100).toFixed(1)}%` : 'N/A'}
          color="text-yellow-400"
        />
        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value={stats.avg_response_time ? `${stats.avg_response_time.toFixed(1)}s` : 'N/A'}
          color="text-purple-400"
        />
      </div>

      {/* Top Queries */}
      {stats.top_queries && stats.top_queries.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Queries</h3>
          <div className="space-y-2">
            {stats.top_queries.slice(0, 10).map((query, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <span className="text-slate-300">{query.query}</span>
                <span className="text-slate-400 text-sm">{query.count} times</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Embed Tab Component
interface EmbedTabProps {
  embedCode: string;
  onCopy: () => void;
  copied: boolean;
}

const EmbedTab: React.FC<EmbedTabProps> = ({ embedCode, onCopy, copied }) => {
  return (
    <motion.div
      key="embed"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Embed Code</h3>
          <button
            onClick={onCopy}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>
        </div>

        <p className="text-slate-400 mb-4">
          Copy and paste this code into your website to embed the chatbot.
        </p>

        <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-x-auto">
          <code className="text-sm text-slate-300">{embedCode || 'Loading embed code...'}</code>
        </pre>
      </div>
    </motion.div>
  );
};

// Stat Card Component
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 bg-slate-900 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};
