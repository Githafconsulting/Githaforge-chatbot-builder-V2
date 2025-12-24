import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Plus, Trash2, Edit2, Bot, AlertTriangle, RefreshCw,
  Copy, Check, ChevronDown, ChevronUp, Users, Building2, Clock
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import type { Persona } from '../../types';

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface PersonaUsage {
  persona_id: string;
  persona_name: string;
  total_chatbots: number;
  chatbots: Array<{
    id: string;
    name: string;
    company_id: string;
    company_name: string;
  }>;
}

export const SystemPersonas: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, PersonaUsage>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: ''
  });

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSystemPersonas();
      setPersonas(data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load system personas:', err);
      setError(err.response?.data?.detail || 'Failed to load system personas');
      toast.error('Failed to load system personas');
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async (personaId: string) => {
    if (usageData[personaId]) return; // Already loaded

    try {
      setLoadingUsage(personaId);
      const data = await apiService.getSystemPersonaUsage(personaId);
      setUsageData(prev => ({ ...prev, [personaId]: data }));
    } catch (err: any) {
      console.error('Failed to load persona usage:', err);
      toast.error('Failed to load usage data');
    } finally {
      setLoadingUsage(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.system_prompt.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }

    try {
      setProcessing(true);
      await apiService.createSystemPersona(formData);
      toast.success('System persona created successfully');
      await loadPersonas();
      setShowCreateModal(false);
      setFormData({ name: '', description: '', system_prompt: '' });
    } catch (err: any) {
      console.error('Failed to create persona:', err);
      toast.error(err.response?.data?.detail || 'Failed to create persona');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersona) return;

    try {
      setProcessing(true);
      await apiService.updateSystemPersona(selectedPersona.id, formData);
      toast.success('System persona updated successfully');
      await loadPersonas();
      setShowEditModal(false);
      setSelectedPersona(null);
      // Clear cached usage data since we updated
      setUsageData({});
    } catch (err: any) {
      console.error('Failed to update persona:', err);
      toast.error(err.response?.data?.detail || 'Failed to update persona');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPersona) return;

    try {
      setProcessing(true);
      await apiService.deleteSystemPersona(selectedPersona.id);
      toast.success('System persona deleted');
      await loadPersonas();
      setShowDeleteModal(false);
      setSelectedPersona(null);
      // Clear cached usage data
      setUsageData({});
    } catch (err: any) {
      console.error('Failed to delete persona:', err);
      toast.error(err.response?.data?.detail || 'Failed to delete persona');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (persona: Persona) => {
    setSelectedPersona(persona);
    setFormData({
      name: persona.name,
      description: persona.description || '',
      system_prompt: persona.system_prompt
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (persona: Persona) => {
    setSelectedPersona(persona);
    loadUsage(persona.id);
    setShowDeleteModal(true);
  };

  const toggleExpand = async (personaId: string) => {
    if (expandedId === personaId) {
      setExpandedId(null);
    } else {
      setExpandedId(personaId);
      loadUsage(personaId);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">System Personas</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Manage global default personas for all companies
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', description: '', system_prompt: '' });
            setShowCreateModal(true);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Create Persona
        </button>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="text-purple-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="text-purple-300 font-medium">System Personas</h3>
            <p className="text-slate-400 text-sm mt-1">
              System personas are global defaults available to all companies. Companies can view
              these personas but cannot edit them. They can clone system personas to create their
              own editable copies. Changes here will affect all companies using these personas.
            </p>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Personas List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
            Loading system personas...
          </div>
        ) : personas.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            <Bot size={48} className="mx-auto mb-4 text-slate-500" />
            <p>No system personas configured.</p>
            <p className="text-sm mt-2">Click "Create Persona" to add the first one.</p>
          </div>
        ) : (
          personas.map((persona) => (
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-lg overflow-hidden border border-purple-500/20"
            >
              {/* Persona Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50"
                onClick={() => toggleExpand(persona.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-50">{persona.name}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                        System Default
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-400">{persona.description || 'No description'}</p>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} />
                        {formatRelativeTime(persona.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(persona); }}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"
                    title="Edit persona"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDeleteModal(persona); }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"
                    title="Delete persona"
                  >
                    <Trash2 size={18} />
                  </button>
                  {expandedId === persona.id ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === persona.id && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* System Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">System Prompt</label>
                      <button
                        onClick={() => copyToClipboard(persona.system_prompt, persona.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        {copiedId === persona.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === persona.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {persona.system_prompt}
                      </pre>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Usage Across Companies
                    </h4>
                    {loadingUsage === persona.id ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <RefreshCw size={16} className="animate-spin" />
                        Loading usage data...
                      </div>
                    ) : usageData[persona.id] ? (
                      usageData[persona.id].total_chatbots === 0 ? (
                        <p className="text-slate-500 text-sm">No chatbots are currently using this persona.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-slate-300">
                            <span className="text-lg font-bold text-purple-400">
                              {usageData[persona.id].total_chatbots}
                            </span>{' '}
                            chatbot{usageData[persona.id].total_chatbots !== 1 ? 's' : ''} using this persona
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                            {usageData[persona.id].chatbots.slice(0, 6).map((chatbot) => (
                              <div
                                key={chatbot.id}
                                className="bg-slate-800 rounded-lg p-2 flex items-center gap-2"
                              >
                                <Bot size={14} className="text-purple-400" />
                                <span className="text-sm text-slate-300">{chatbot.name}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">
                                  <Building2 size={10} />
                                  {chatbot.company_name}
                                </span>
                              </div>
                            ))}
                          </div>
                          {usageData[persona.id].chatbots.length > 6 && (
                            <p className="text-xs text-slate-500 mt-2">
                              And {usageData[persona.id].chatbots.length - 6} more...
                            </p>
                          )}
                        </div>
                      )
                    ) : (
                      <p className="text-slate-500 text-sm">Click to load usage data</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-semibold text-slate-50 mb-2">Create System Persona</h3>
            <p className="text-sm text-slate-400 mb-4">
              This persona will be available to all companies as a read-only default.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Persona Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Technical Support, Sales Assistant"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the persona's purpose"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  System Prompt *
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Use placeholders: {'{brand_name}'}, {'{support_email}'}, {'{brand_website}'}, {'{context}'}, {'{history}'}, {'{query}'}
                </p>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are a helpful assistant for {brand_name}..."
                  rows={12}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Persona
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={processing}
                  className="flex-1 bg-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-semibold text-slate-50 mb-2">Edit System Persona</h3>
            <p className="text-sm text-slate-400 mb-4">
              Changes will be reflected immediately for all companies using this persona.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Persona Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  System Prompt *
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Use placeholders: {'{brand_name}'}, {'{support_email}'}, {'{brand_website}'}, {'{context}'}, {'{history}'}, {'{query}'}
                </p>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPersona(null);
                  }}
                  disabled={processing}
                  className="flex-1 bg-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-50">Delete System Persona</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm mb-2">
                You are about to delete <strong>"{selectedPersona.name}"</strong>
              </p>
              {usageData[selectedPersona.id] ? (
                usageData[selectedPersona.id].total_chatbots > 0 ? (
                  <p className="text-red-400 text-sm">
                    <strong>Warning:</strong> This persona is currently used by{' '}
                    <strong>{usageData[selectedPersona.id].total_chatbots}</strong> chatbot
                    {usageData[selectedPersona.id].total_chatbots !== 1 ? 's' : ''} across{' '}
                    companies. Deleting it will set their persona to NULL.
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm">
                    No chatbots are currently using this persona.
                  </p>
                )
              ) : loadingUsage === selectedPersona.id ? (
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Checking usage...
                </p>
              ) : null}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={processing}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Persona
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPersona(null);
                }}
                disabled={processing}
                className="flex-1 bg-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
