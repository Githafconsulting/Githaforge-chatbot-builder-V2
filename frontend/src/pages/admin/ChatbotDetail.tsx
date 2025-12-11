import React, { useState, useEffect, useRef } from 'react';
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
  ThumbsUp,
  Clock,
  AlertCircle,
  Palette,
  Send,
  GraduationCap,
  X,
  RefreshCw,
  Sparkles,
  Database,
  Globe,
  FileText,
  Target,
  Phone,
  Mail,
  MapPin,
  Zap,
  ExternalLink,
  EyeOff,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import type { Chatbot, ChatbotUpdate, ChatbotStats, ChatbotWithEmbedCode, ChatResponse, Persona, Document } from '../../types';

type TabType = 'settings' | 'appearance' | 'training' | 'analytics' | 'embed';

export const ChatbotDetailPage: React.FC = () => {
  const { chatbotId } = useParams<{ chatbotId: string }>();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [stats, setStats] = useState<ChatbotStats | null>(null);
  const [embedCode, setEmbedCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [copied, setCopied] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (chatbotId) {
      loadInitialData();
      // Load non-critical data separately (doesn't block UI)
      loadStats();
      loadEmbedCode();
    }
  }, [chatbotId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Load chatbot, personas, and documents in parallel
      const [chatbotData, personasData, documentsData] = await Promise.all([
        apiService.getChatbot(chatbotId!),
        apiService.getPersonas(),
        apiService.getDocuments()
      ]);
      setChatbot(chatbotData);
      setPersonas(personasData);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
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
        widget_theme: chatbot.widget_theme,
        widget_position: chatbot.widget_position,
        button_size: chatbot.button_size,
        show_notification_badge: chatbot.show_notification_badge,
        widget_title: chatbot.widget_title,
        widget_subtitle: chatbot.widget_subtitle,
        padding_x: chatbot.padding_x,
        padding_y: chatbot.padding_y,
        z_index: chatbot.z_index,
        model_preset: chatbot.model_preset,
        temperature: chatbot.temperature,
        max_tokens: chatbot.max_tokens,
        top_k: chatbot.top_k,
        similarity_threshold: chatbot.similarity_threshold,
        allowed_domains: chatbot.allowed_domains,
        rate_limit_per_ip: chatbot.rate_limit_per_ip,
        persona_id: chatbot.persona_id,
        use_shared_kb: chatbot.use_shared_kb,
        selected_document_ids: chatbot.selected_document_ids,
        enable_custom_contact: chatbot.enable_custom_contact,
        contact_phone: chatbot.contact_phone,
        contact_email: chatbot.contact_email,
        contact_address: chatbot.contact_address,
        contact_hours: chatbot.contact_hours,
        response_style: chatbot.response_style,
        paused_message: chatbot.paused_message,
      };
      const updated = await apiService.updateChatbot(chatbot.id, updates);
      setChatbot(updated);

      // Broadcast update to any open test pages for live sync
      try {
        const channel = new BroadcastChannel('chatbot-settings-sync');
        channel.postMessage({
          type: 'CHATBOT_UPDATED',
          chatbotId: chatbot.id,
          chatbot: updated
        });
        channel.close();
      } catch (e) {
        // BroadcastChannel not supported or failed - ignore
      }

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

      // Broadcast update to any open test pages for live sync
      try {
        const channel = new BroadcastChannel('chatbot-settings-sync');
        channel.postMessage({
          type: 'CHATBOT_UPDATED',
          chatbotId: chatbot.id,
          chatbot: updated
        });
        channel.close();
      } catch (e) {
        // BroadcastChannel not supported or failed - ignore
      }

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

      // Broadcast update to any open test pages for live sync
      try {
        const channel = new BroadcastChannel('chatbot-settings-sync');
        channel.postMessage({
          type: 'CHATBOT_UPDATED',
          chatbotId: chatbot.id,
          chatbot: updated
        });
        channel.close();
      } catch (e) {
        // BroadcastChannel not supported or failed - ignore
      }

      toast.success('Chatbot paused successfully!');
    } catch (error: any) {
      console.error('Failed to pause chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to pause chatbot');
    }
  };

  const handleHide = async () => {
    if (!chatbot) return;

    try {
      const updated = await apiService.hideChatbot(chatbot.id);
      setChatbot(updated);

      // Broadcast update to any open test pages for live sync
      try {
        const channel = new BroadcastChannel('chatbot-settings-sync');
        channel.postMessage({
          type: 'CHATBOT_UPDATED',
          chatbotId: chatbot.id,
          chatbot: updated
        });
        channel.close();
      } catch (e) {
        // BroadcastChannel not supported or failed - ignore
      }

      toast.success('Chatbot hidden from website');
    } catch (error: any) {
      console.error('Failed to hide chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to hide chatbot');
    }
  };

  const handleShow = async () => {
    if (!chatbot) return;

    try {
      const updated = await apiService.showChatbot(chatbot.id);
      setChatbot(updated);

      // Broadcast update to any open test pages for live sync
      try {
        const channel = new BroadcastChannel('chatbot-settings-sync');
        channel.postMessage({
          type: 'CHATBOT_UPDATED',
          chatbotId: chatbot.id,
          chatbot: updated
        });
        channel.close();
      } catch (e) {
        // BroadcastChannel not supported or failed - ignore
      }

      toast.success('Chatbot is now visible on website');
    } catch (error: any) {
      console.error('Failed to show chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to show chatbot');
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

  const handleTestChatbot = () => {
    if (!chatbot) return;

    // Open test page - it fetches latest settings from API
    const testUrl = new URL('/chatbot-test', window.location.origin);
    testUrl.searchParams.set('chatbotId', chatbot.id);

    // Open in new tab
    window.open(testUrl.toString(), '_blank');
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

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'embed', label: 'Embed', icon: Code },
  ];

  return (
    <div className="flex flex-col -mt-6 lg:-mt-8 -mx-6 lg:-mx-8">
      {/* Fixed Header and Tabs */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/95 backdrop-blur-sm pb-4 px-6 lg:px-8 pt-6 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
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
            <button
              onClick={handleTestChatbot}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Test Chatbot
            </button>
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
            {chatbot.is_active ? (
              <button
                onClick={handleHide}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                title="Hide chatbot from website"
              >
                <EyeOff className="w-4 h-4" />
                Hide
              </button>
            ) : (
              <button
                onClick={handleShow}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                title="Show chatbot on website"
              >
                <Eye className="w-4 h-4" />
                Show
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
        <div className="flex gap-1 border-b border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-6 px-6 lg:px-8">
        <AnimatePresence mode="wait">
        {activeTab === 'settings' && (
          <SettingsTab
            chatbot={chatbot}
            setChatbot={setChatbot}
            onSave={handleSave}
            saving={saving}
            personas={personas}
            documents={documents}
          />
        )}
        {activeTab === 'appearance' && (
          <AppearanceTab
            chatbot={chatbot}
            setChatbot={setChatbot}
            onSave={handleSave}
            saving={saving}
          />
        )}
        {activeTab === 'training' && (
          <TrainingTab chatbot={chatbot} />
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
    </div>
  );
};

// Settings Tab Component
interface SettingsTabProps {
  chatbot: Chatbot;
  setChatbot: (chatbot: Chatbot) => void;
  onSave: () => void;
  saving: boolean;
  personas: Persona[];
  documents: Document[];
}

const SettingsTab: React.FC<SettingsTabProps> = ({ chatbot, setChatbot, onSave, saving, personas, documents }) => {
  // Filter documents for selection (only shared documents)
  const availableDocuments = documents.filter(d => d.is_shared !== false);

  const toggleDocumentSelection = (docId: string) => {
    const currentSelected = chatbot.selected_document_ids || [];
    const newSelected = currentSelected.includes(docId)
      ? currentSelected.filter(id => id !== docId)
      : [...currentSelected, docId];
    setChatbot({ ...chatbot, selected_document_ids: newSelected });
  };

  const selectedPersona = personas.find(p => p.id === chatbot.persona_id);

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Basic Information */}
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
      </div>

      {/* Response Style */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Response Style</h3>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Control how verbose or detailed the chatbot's responses should be.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setChatbot({ ...chatbot, response_style: 'concise' })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              (chatbot.response_style || 'standard') === 'concise'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="font-medium text-white">Concise</span>
            </div>
            <p className="text-xs text-slate-400">
              1-2 sentences. Quick, direct answers with no filler.
            </p>
          </button>

          <button
            onClick={() => setChatbot({ ...chatbot, response_style: 'standard' })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              (chatbot.response_style || 'standard') === 'standard'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-medium text-white">Standard</span>
            </div>
            <p className="text-xs text-slate-400">
              2-3 sentences. Balanced responses with context.
            </p>
          </button>

          <button
            onClick={() => setChatbot({ ...chatbot, response_style: 'detailed' })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              (chatbot.response_style || 'standard') === 'detailed'
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="font-medium text-white">Detailed</span>
            </div>
            <p className="text-xs text-slate-400">
              3-5 sentences. Comprehensive answers with examples.
            </p>
          </button>
        </div>
      </div>

      {/* Persona Assignment */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Persona Assignment</h3>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Assign a persona to define this chatbot's personality, expertise area, and response style.
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Select Persona</label>
          <select
            value={chatbot.persona_id || ''}
            onChange={(e) => setChatbot({ ...chatbot, persona_id: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">No Persona (Default behavior)</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name} - {persona.description || 'No description'}
              </option>
            ))}
          </select>
        </div>

        {selectedPersona && (
          <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-sm font-medium text-purple-300 mb-2">{selectedPersona.name}</p>
            <p className="text-xs text-slate-400 mb-2">{selectedPersona.description}</p>
            <p className="text-xs text-slate-500 line-clamp-3 font-mono">
              {selectedPersona.system_prompt?.substring(0, 200)}...
            </p>
          </div>
        )}
      </div>

      {/* Knowledge Base Mode */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Knowledge Base Access</h3>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Choose whether this chatbot accesses the entire shared knowledge base or only specific documents.
        </p>

        {/* KB Mode Toggle */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setChatbot({ ...chatbot, use_shared_kb: true, selected_document_ids: [] })}
            className={`p-4 rounded-lg border-2 transition-all ${
              chatbot.use_shared_kb
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">Shared Knowledge Base</span>
            </div>
            <p className="text-xs text-slate-400 text-left">
              Access all shared documents in your company's knowledge base
            </p>
          </button>

          <button
            onClick={() => setChatbot({ ...chatbot, use_shared_kb: false })}
            className={`p-4 rounded-lg border-2 transition-all ${
              !chatbot.use_shared_kb
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-white">Selected Documents Only</span>
            </div>
            <p className="text-xs text-slate-400 text-left">
              Only access specific documents you choose below
            </p>
          </button>
        </div>

        {/* Document Picker (when not using shared KB) */}
        {!chatbot.use_shared_kb && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Select Documents ({chatbot.selected_document_ids?.length || 0} selected)
            </label>

            {availableDocuments.length === 0 ? (
              <div className="p-6 text-center bg-slate-900 rounded-lg border border-slate-700">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No shared documents available</p>
                <p className="text-xs text-slate-500 mt-1">Upload documents to your knowledge base first</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700">
                {availableDocuments.map((doc) => {
                  const isSelected = chatbot.selected_document_ids?.includes(doc.id) || false;
                  return (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 border-b border-slate-700 last:border-0 cursor-pointer hover:bg-slate-800 transition-colors ${
                        isSelected ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                        <p className="text-xs text-slate-400">
                          {doc.file_type.toUpperCase()} • {doc.chunk_count || 0} chunks
                          {doc.scope && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              {doc.scope}
                            </span>
                          )}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {(chatbot.selected_document_ids?.length || 0) === 0 && !chatbot.use_shared_kb && (
              <p className="mt-2 text-xs text-amber-400">
                Please select at least one document for this chatbot to use.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Connected Documents Summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Connected Documents</h3>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
            {chatbot.use_shared_kb
              ? `${availableDocuments.length} shared documents`
              : `${chatbot.selected_document_ids?.length || 0} selected`}
          </span>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          {chatbot.use_shared_kb
            ? 'This chatbot has access to all shared documents in your knowledge base.'
            : 'This chatbot only has access to the selected documents below.'}
        </p>

        {(() => {
          const connectedDocs = chatbot.use_shared_kb
            ? availableDocuments
            : documents.filter(d => chatbot.selected_document_ids?.includes(d.id));

          if (connectedDocs.length === 0) {
            return (
              <div className="p-6 text-center bg-slate-900 rounded-lg border border-slate-700">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No documents connected</p>
                <p className="text-xs text-slate-500 mt-1">
                  {chatbot.use_shared_kb
                    ? 'Upload documents to your knowledge base'
                    : 'Select documents above to connect them'}
                </p>
              </div>
            );
          }

          return (
            <div className="max-h-48 overflow-y-auto bg-slate-900 rounded-lg border border-slate-700">
              {connectedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border-b border-slate-700 last:border-0"
                >
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{doc.title}</p>
                    <p className="text-xs text-slate-400">
                      {doc.file_type?.toUpperCase()} • {doc.chunk_count || 0} chunks
                      {doc.category && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {doc.category}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Custom Contact Details */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Contact Details</h3>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={chatbot.enable_custom_contact ?? false}
              onChange={(e) => setChatbot({ ...chatbot, enable_custom_contact: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            <span className="ml-2 text-sm text-slate-300">Enable Custom</span>
          </label>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          {chatbot.enable_custom_contact
            ? 'Custom contact details will be used in fallback responses.'
            : 'Enable to provide custom contact information for this chatbot. Otherwise, company defaults are used.'}
        </p>

        {chatbot.enable_custom_contact && (
          <div className="space-y-4 pt-2 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Phone Number
                  </div>
                </label>
                <input
                  type="tel"
                  value={chatbot.contact_phone || ''}
                  onChange={(e) => setChatbot({ ...chatbot, contact_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Email Address
                  </div>
                </label>
                <input
                  type="email"
                  value={chatbot.contact_email || ''}
                  onChange={(e) => setChatbot({ ...chatbot, contact_email: e.target.value })}
                  placeholder="support@company.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Physical Address
                </div>
              </label>
              <input
                type="text"
                value={chatbot.contact_address || ''}
                onChange={(e) => setChatbot({ ...chatbot, contact_address: e.target.value })}
                placeholder="123 Main St, City, Country"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Business Hours
                </div>
              </label>
              <input
                type="text"
                value={chatbot.contact_hours || ''}
                onChange={(e) => setChatbot({ ...chatbot, contact_hours: e.target.value })}
                placeholder="Mon-Fri 9AM-5PM EST"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || (!chatbot.use_shared_kb && (chatbot.selected_document_ids?.length || 0) === 0)}
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
    </motion.div>
  );
};

// Appearance Tab Component
interface AppearanceTabProps {
  chatbot: Chatbot;
  setChatbot: (chatbot: Chatbot) => void;
  onSave: () => void;
  saving: boolean;
}

const AppearanceTab: React.FC<AppearanceTabProps> = ({ chatbot, setChatbot, onSave, saving }) => {
  return (
    <motion.div
      key="appearance"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="lg:grid lg:grid-cols-2 gap-6"
    >
      {/* Left Side - Settings */}
      <div className="space-y-6">
        {/* Theme & Colors */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Theme & Colors</h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Widget Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {(['modern', 'minimal', 'classic'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setChatbot({ ...chatbot, widget_theme: theme })}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    (chatbot.widget_theme || 'modern') === theme
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={chatbot.primary_color || '#1E40AF'}
                  onChange={(e) => setChatbot({ ...chatbot, primary_color: e.target.value })}
                  className="w-12 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-slate-700"
                />
                <input
                  type="text"
                  value={chatbot.primary_color || '#1E40AF'}
                  onChange={(e) => setChatbot({ ...chatbot, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Secondary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={chatbot.secondary_color || '#3B82F6'}
                  onChange={(e) => setChatbot({ ...chatbot, secondary_color: e.target.value })}
                  className="w-12 h-10 rounded-lg cursor-pointer border-2 border-slate-600 bg-slate-700"
                />
                <input
                  type="text"
                  value={chatbot.secondary_color || '#3B82F6'}
                  onChange={(e) => setChatbot({ ...chatbot, secondary_color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Button Size</label>
            <div className="grid grid-cols-3 gap-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setChatbot({ ...chatbot, button_size: size })}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                    (chatbot.button_size || 'medium') === size
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-slate-700/30 rounded-lg">
            <div>
              <label className="text-sm font-medium text-slate-200">Notification Badge</label>
              <p className="text-xs text-slate-400 mt-0.5">Show pulsing dot on button</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={chatbot.show_notification_badge ?? true}
                onChange={(e) => setChatbot({ ...chatbot, show_notification_badge: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Position & Layout */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Position & Layout</h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Screen Position</label>
            <div className="relative bg-slate-900 rounded-xl p-4 border border-slate-700">
              <div className="relative w-full h-32 bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setChatbot({ ...chatbot, widget_position: 'top-left' })}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-full transition-all ${
                    chatbot.widget_position === 'top-left'
                      ? 'bg-blue-500 ring-2 ring-blue-400 scale-110'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
                <button
                  onClick={() => setChatbot({ ...chatbot, widget_position: 'top-right' })}
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full transition-all ${
                    chatbot.widget_position === 'top-right'
                      ? 'bg-blue-500 ring-2 ring-blue-400 scale-110'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
                <button
                  onClick={() => setChatbot({ ...chatbot, widget_position: 'bottom-left' })}
                  className={`absolute bottom-2 left-2 w-6 h-6 rounded-full transition-all ${
                    chatbot.widget_position === 'bottom-left'
                      ? 'bg-blue-500 ring-2 ring-blue-400 scale-110'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
                <button
                  onClick={() => setChatbot({ ...chatbot, widget_position: 'bottom-right' })}
                  className={`absolute bottom-2 right-2 w-6 h-6 rounded-full transition-all ${
                    (chatbot.widget_position || 'bottom-right') === 'bottom-right'
                      ? 'bg-blue-500 ring-2 ring-blue-400 scale-110'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-slate-500 text-xs px-2 py-1 bg-slate-800/80 rounded">
                    {(chatbot.widget_position || 'bottom-right').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Horizontal Padding</label>
              <input
                type="number"
                value={chatbot.padding_x ?? 20}
                onChange={(e) => setChatbot({ ...chatbot, padding_x: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                min="0"
                max="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Vertical Padding</label>
              <input
                type="number"
                value={chatbot.padding_y ?? 20}
                onChange={(e) => setChatbot({ ...chatbot, padding_y: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                min="0"
                max="200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Z-Index (Layer Priority)</label>
            <input
              type="number"
              value={chatbot.z_index ?? 9999}
              onChange={(e) => setChatbot({ ...chatbot, z_index: parseInt(e.target.value) || 9999 })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
            />
            <p className="text-xs text-slate-400 mt-1">Higher values appear above other elements</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Widget Content</h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Widget Title</label>
            <input
              type="text"
              value={chatbot.widget_title || chatbot.name}
              onChange={(e) => setChatbot({ ...chatbot, widget_title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              placeholder="AI Assistant"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Widget Subtitle</label>
            <input
              type="text"
              value={chatbot.widget_subtitle || 'Always here to help'}
              onChange={(e) => setChatbot({ ...chatbot, widget_subtitle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              placeholder="Always here to help"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Greeting Message</label>
            <p className="text-xs text-slate-400 mb-2">Initial message shown when users open the chat</p>
            <input
              type="text"
              value={chatbot.greeting_message}
              onChange={(e) => setChatbot({ ...chatbot, greeting_message: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
              placeholder="Hi! How can I help you today?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Paused Message</label>
            <p className="text-xs text-slate-400 mb-2">Message shown to users when the chatbot is paused</p>
            <textarea
              value={chatbot.paused_message || 'This chatbot is currently unavailable. Please try again later or contact support.'}
              onChange={(e) => setChatbot({ ...chatbot, paused_message: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white resize-none"
              placeholder="This chatbot is currently unavailable..."
            />
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
      </div>

      {/* Right Side - Preview (Fixed position on large screens) */}
      <div className="hidden lg:block lg:fixed lg:right-8 lg:top-[200px] lg:w-[calc(50%-2rem-144px)]">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
          <div className="relative bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 280px)', maxHeight: '600px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-slate-400 text-sm text-center">
                <p>Preview of your website</p>
                <p className="text-xs mt-1 opacity-70">Click the chat button to interact</p>
              </div>
            </div>
            <WidgetPreview chatbot={chatbot} />
          </div>
        </div>
      </div>

      {/* Mobile Preview (shown below settings on small screens) */}
      <div className="lg:hidden mt-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
          <div className="relative bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-slate-400 text-sm text-center">
                <p>Preview of your website</p>
                <p className="text-xs mt-1 opacity-70">Click the chat button to interact</p>
              </div>
            </div>
            <WidgetPreview chatbot={chatbot} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Widget Preview Component (Static visual preview)
interface WidgetPreviewProps {
  chatbot: Chatbot;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({ chatbot }) => {
  const [isOpen, setIsOpen] = useState(false);
  const position = chatbot.widget_position || 'bottom-right';
  const primaryColor = chatbot.primary_color || '#1E40AF';
  const secondaryColor = chatbot.secondary_color || '#3B82F6';
  const buttonSize = chatbot.button_size || 'medium';
  const showBadge = chatbot.show_notification_badge ?? true;
  const theme = chatbot.widget_theme || 'modern';
  const isPaused = chatbot.deploy_status === 'paused';

  const buttonSizes = {
    small: { width: '50px', height: '50px', icon: 20 },
    medium: { width: '60px', height: '60px', icon: 24 },
    large: { width: '70px', height: '70px', icon: 28 },
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: `${chatbot.padding_y ?? 20}px`, right: `${chatbot.padding_x ?? 20}px` },
    'bottom-left': { bottom: `${chatbot.padding_y ?? 20}px`, left: `${chatbot.padding_x ?? 20}px` },
    'top-right': { top: `${chatbot.padding_y ?? 20}px`, right: `${chatbot.padding_x ?? 20}px` },
    'top-left': { top: `${chatbot.padding_y ?? 20}px`, left: `${chatbot.padding_x ?? 20}px` },
  };

  const getButtonStyle = () => {
    const base: React.CSSProperties = {
      width: buttonSizes[buttonSize].width,
      height: buttonSizes[buttonSize].height,
    };

    switch (theme) {
      case 'modern':
        return { ...base, background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, border: 'none', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)' };
      case 'minimal':
        return { ...base, background: primaryColor, border: `2px solid ${secondaryColor}`, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' };
      case 'classic':
        return { ...base, background: `linear-gradient(to bottom, ${primaryColor}, ${secondaryColor})`, border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)' };
      default:
        return base;
    }
  };

  return (
    <div className="absolute" style={{ ...positionStyles[position], zIndex: chatbot.z_index ?? 9999 }}>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center rounded-full"
          style={getButtonStyle()}
        >
          <MessageSquare className="text-white" size={buttonSizes[buttonSize].icon} />
          {showBadge && theme !== 'minimal' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </motion.button>
      )}

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-80 h-96 bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700"
        >
          {/* Header - matches ChatWidget gradient header */}
          <div
            className="p-4 text-white flex items-center justify-between rounded-t-2xl"
            style={{ background: `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor})` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-base block">{chatbot.widget_title || chatbot.name}</span>
                <span className="text-xs text-blue-100">{chatbot.widget_subtitle || 'Always here to help'}</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages area - matches ChatWidget dark theme */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-900/50">
            {isPaused ? (
              /* Paused state message */
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                  <Pause className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {chatbot.paused_message || 'This chatbot is currently unavailable. Please try again later or contact support.'}
                </p>
              </div>
            ) : (
              /* Normal greeting message */
              <div className="flex flex-col items-start">
                <div className="bg-slate-700 rounded-2xl rounded-tl-sm py-2.5 px-4 max-w-[80%] shadow-md border border-slate-600">
                  <p className="text-sm text-white">{chatbot.greeting_message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Input area - matches ChatWidget styling */}
          <div className={`p-3 border-t border-slate-700 bg-slate-800 ${isPaused ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isPaused ? "Chat is currently paused..." : "Type your message..."}
                className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled
              />
              <button
                className="p-2.5 rounded-xl text-white transition-colors"
                style={{ background: isPaused ? '#64748b' : `linear-gradient(to bottom right, ${primaryColor}, ${secondaryColor})` }}
                disabled
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {isPaused ? 'Chatbot is paused' : 'Visual preview only'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Training Tab Component - Live Interactive Chatbot
interface TrainingTabProps {
  chatbot: Chatbot;
}

const TrainingTab: React.FC<TrainingTabProps> = ({ chatbot }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>([
    { role: 'assistant', content: chatbot.greeting_message }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `training-${chatbot.id}-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await apiService.sendMessage(userMessage, sessionId, chatbot.id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response,
        sources: response.sources
      }]);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([{ role: 'assistant', content: chatbot.greeting_message }]);
  };

  const primaryColor = chatbot.primary_color || '#1E40AF';
  const secondaryColor = chatbot.secondary_color || '#3B82F6';

  return (
    <motion.div
      key="training"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Chat Interface */}
      <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col" style={{ height: '600px' }}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Training Mode</h3>
              <p className="text-xs opacity-80">Test your chatbot with live AI responses</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-900">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'rounded-lg p-3 text-white'
                      : 'rounded-lg p-3 bg-slate-800 border border-slate-700 text-slate-200'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: secondaryColor } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-600">
                      <p className="text-xs text-slate-400 mb-1">Sources:</p>
                      <div className="space-y-1">
                        {msg.sources.slice(0, 3).map((source: any, sIdx: number) => (
                          <p key={sIdx} className="text-xs text-slate-500 truncate">
                            • {source.content?.substring(0, 100)}...
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg p-3 bg-slate-800 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center p-2 rounded-lg text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: isLoading ? '#64748b' : primaryColor }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Training Tips */}
      <div className="space-y-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            Training Tips
          </h3>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="font-medium text-blue-300 mb-1">Test edge cases</p>
              <p className="text-slate-400">Ask questions the chatbot might struggle with to identify gaps.</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="font-medium text-green-300 mb-1">Check sources</p>
              <p className="text-slate-400">Verify the AI is using the correct knowledge base documents.</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="font-medium text-yellow-300 mb-1">Test greetings</p>
              <p className="text-slate-400">Try casual messages like "hi" or "thanks" to test conversation flow.</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="font-medium text-purple-300 mb-1">Multi-turn conversations</p>
              <p className="text-slate-400">Ask follow-up questions to test context retention.</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-sm text-blue-200">
          <p className="font-medium mb-1">Session ID:</p>
          <p className="text-xs text-blue-400 font-mono break-all">{sessionId}</p>
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
          <code className="text-sm text-green-400">{embedCode || 'Loading embed code...'}</code>
        </pre>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">Installation Instructions</h4>
        <ol className="text-sm text-blue-200 space-y-2 list-decimal list-inside">
          <li>Copy the embed code above</li>
          <li>Paste it just before the closing <code className="bg-slate-800 px-1 rounded">&lt;/body&gt;</code> tag</li>
          <li>The chat widget will appear automatically on your website</li>
          <li>Make sure to deploy your chatbot first!</li>
        </ol>
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
