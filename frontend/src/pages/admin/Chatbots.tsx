import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  Play,
  Pause,
  Trash2,
  Settings,
  BarChart3,
  Code,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Chatbot, ChatbotCreate } from '../../types';

export const ChatbotsPage: React.FC = () => {
  const navigate = useNavigate();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadChatbots();
  }, []);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChatbots();
      // Handle both array and object response formats
      const chatbotsList = Array.isArray(response) ? response : (response.chatbots || []);
      setChatbots(chatbotsList);
    } catch (error) {
      console.error('Failed to load chatbots:', error);
      toast.error('Failed to load chatbots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChatbot = async (data: ChatbotCreate) => {
    try {
      setCreating(true);
      const newChatbot = await apiService.createChatbot(data);
      setChatbots([newChatbot, ...chatbots]);
      setShowCreateModal(false);
      toast.success(`Chatbot "${newChatbot.name}" created successfully!`);
    } catch (error: any) {
      console.error('Failed to create chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to create chatbot');
    } finally {
      setCreating(false);
    }
  };

  const handleDeployChatbot = async (chatbot: Chatbot) => {
    try {
      const updated = await apiService.deployChatbot(chatbot.id);
      setChatbots(chatbots.map(c => c.id === chatbot.id ? updated : c));
      toast.success(`${chatbot.name} deployed successfully!`);
    } catch (error: any) {
      console.error('Failed to deploy chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to deploy chatbot');
    }
  };

  const handlePauseChatbot = async (chatbot: Chatbot) => {
    try {
      const updated = await apiService.pauseChatbot(chatbot.id);
      setChatbots(chatbots.map(c => c.id === chatbot.id ? updated : c));
      toast.success(`${chatbot.name} paused successfully!`);
    } catch (error: any) {
      console.error('Failed to pause chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to pause chatbot');
    }
  };

  const handleDeleteChatbot = async (chatbot: Chatbot) => {
    if (!confirm(`Are you sure you want to delete "${chatbot.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteChatbot(chatbot.id);
      setChatbots(chatbots.filter(c => c.id !== chatbot.id));
      toast.success(`${chatbot.name} deleted successfully!`);
    } catch (error: any) {
      console.error('Failed to delete chatbot:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete chatbot');
    }
  };

  const filteredChatbots = chatbots.filter(chatbot =>
    chatbot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chatbot.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Chatbots</h1>
          <p className="text-slate-400 mt-1">
            Manage your AI chatbots and deploy them to your websites
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Chatbot
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chatbots..."
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Chatbots Grid */}
      {filteredChatbots.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Bot className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            {searchQuery ? 'No chatbots found' : 'No chatbots yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first chatbot to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Chatbot
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChatbots.map((chatbot) => (
            <ChatbotCard
              key={chatbot.id}
              chatbot={chatbot}
              onDeploy={() => handleDeployChatbot(chatbot)}
              onPause={() => handlePauseChatbot(chatbot)}
              onDelete={() => handleDeleteChatbot(chatbot)}
              onViewDetails={() => navigate(`/admin/chatbots/${chatbot.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateChatbotModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateChatbot}
            creating={creating}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Chatbot Card Component
interface ChatbotCardProps {
  chatbot: Chatbot;
  onDeploy: () => void;
  onPause: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

const ChatbotCard: React.FC<ChatbotCardProps> = ({
  chatbot,
  onDeploy,
  onPause,
  onDelete,
  onViewDetails,
}) => {
  const getStatusIcon = () => {
    switch (chatbot.deploy_status) {
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'draft':
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (chatbot.deploy_status) {
      case 'deployed':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (chatbot.deploy_status) {
      case 'deployed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'draft':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default:
        return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{chatbot.name}</h3>
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getStatusColor()} mt-1 w-fit`}>
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {chatbot.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {chatbot.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-900 rounded p-2">
          <div className="text-xs text-slate-400">Chats</div>
          <div className="text-lg font-semibold text-white">
            {chatbot.total_conversations.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900 rounded p-2">
          <div className="text-xs text-slate-400">Messages</div>
          <div className="text-lg font-semibold text-white">
            {chatbot.total_messages.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900 rounded p-2">
          <div className="text-xs text-slate-400">Rating</div>
          <div className="text-lg font-semibold text-white">
            {chatbot.avg_satisfaction ? `${(chatbot.avg_satisfaction * 100).toFixed(0)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage
        </button>
        {chatbot.deploy_status === 'deployed' ? (
          <button
            onClick={onPause}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
            title="Pause chatbot"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onDeploy}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            title="Deploy chatbot"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          title="Delete chatbot"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// Create Chatbot Modal Component
interface CreateChatbotModalProps {
  onClose: () => void;
  onCreate: (data: ChatbotCreate) => void;
  creating: boolean;
}

const CreateChatbotModal: React.FC<CreateChatbotModalProps> = ({
  onClose,
  onCreate,
  creating,
}) => {
  const [formData, setFormData] = useState<ChatbotCreate>({
    name: '',
    description: '',
    greeting_message: 'Hello! How can I help you today?',
    model_preset: 'balanced',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Create New Chatbot</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Sales Assistant"
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Helps customers with product questions..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Greeting Message */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Greeting Message
            </label>
            <input
              type="text"
              value={formData.greeting_message}
              onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
              placeholder="Hello! How can I help you today?"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Model Preset */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Model Preset
            </label>
            <select
              value={formData.model_preset}
              onChange={(e) => setFormData({ ...formData, model_preset: e.target.value as 'fast' | 'balanced' | 'accurate' })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="fast">Fast (Quick responses)</option>
              <option value="balanced">Balanced (Recommended)</option>
              <option value="accurate">Accurate (High quality)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !formData.name}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Chatbot
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
