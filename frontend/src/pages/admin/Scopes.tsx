import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, RefreshCw, RotateCcw, Bot, Sparkles, ChevronDown, ChevronUp, Copy, Check, Clock } from 'lucide-react';
import { apiService } from '../../services/api';
import type { Scope, ScopeCreate, ScopeUpdate } from '../../types';

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

export const ScopesPage: React.FC = () => {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedScope, setSelectedScope] = useState<Scope | null>(null);
  const [expandedScopeId, setExpandedScopeId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state for create
  const [createForm, setCreateForm] = useState<ScopeCreate>({
    name: '',
    description: '',
  });

  // Form state for edit
  const [editForm, setEditForm] = useState<ScopeUpdate>({
    name: '',
    description: '',
    system_prompt: '',
  });

  // Regenerate context
  const [regenerateContext, setRegenerateContext] = useState('');

  useEffect(() => {
    loadScopes();
  }, []);

  const loadScopes = async () => {
    try {
      setLoading(true);
      const data = await apiService.getScopes(true);
      setScopes(data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load scopes:', err);
      setError(err.response?.data?.detail || 'Failed to load scopes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setError('Scope name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      await apiService.createScope(createForm);
      await loadScopes();
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create scope');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScope) return;

    try {
      setUpdating(true);
      setError('');
      await apiService.updateScope(selectedScope.id, editForm);
      await loadScopes();
      setShowEditModal(false);
      setSelectedScope(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update scope');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteScope = async (scope: Scope) => {
    if (scope.is_default) {
      setError('Cannot delete default scopes');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${scope.name}"? Chatbots using this scope will lose their scope assignment.`)) {
      return;
    }

    try {
      await apiService.deleteScope(scope.id);
      await loadScopes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete scope');
    }
  };

  const handleRegeneratePrompt = async (scope: Scope) => {
    try {
      setRegenerating(scope.id);
      setError('');
      const updatedScope = await apiService.regenerateScopePrompt(scope.id, { context: regenerateContext || undefined });
      // Update just the regenerated scope in state without reloading all scopes
      setScopes(prev => prev.map(s => s.id === updatedScope.id ? { ...s, ...updatedScope } : s));
      setRegenerateContext('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to regenerate prompt');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRestoreLastSaved = async (scope: Scope) => {
    if (scope.prompt_history.length === 0) {
      setError('No previous versions available');
      return;
    }

    try {
      const updatedScope = await apiService.restoreScopeToLastSaved(scope.id);
      // Update just the restored scope in state without reloading all scopes
      setScopes(prev => prev.map(s => s.id === updatedScope.id ? { ...s, ...updatedScope } : s));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to restore');
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setLoading(true);
      await apiService.seedDefaultScopes();
      await loadScopes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to seed default scopes');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (scope: Scope) => {
    setSelectedScope(scope);
    setEditForm({
      name: scope.name,
      description: scope.description || '',
      system_prompt: scope.system_prompt,
    });
    setShowEditModal(true);
  };

  const copyPromptToClipboard = async (prompt: string, scopeId: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(scopeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpanded = (scopeId: string) => {
    setExpandedScopeId(expandedScopeId === scopeId ? null : scopeId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Scopes</h1>
            <p className="text-slate-400 text-sm mt-0.5">Configure role-based prompts for your chatbots</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSeedDefaults}
            className="bg-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Restore Defaults
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Create Scope
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Scopes List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            Loading scopes...
          </div>
        ) : scopes.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            <Sparkles size={48} className="mx-auto mb-4 text-slate-500" />
            <p>No scopes configured. Click "Restore Defaults" to create default scopes.</p>
          </div>
        ) : (
          scopes.map((scope) => (
            <div key={scope.id} className="bg-slate-800 rounded-lg overflow-hidden">
              {/* Scope Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50"
                onClick={() => toggleExpanded(scope.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    scope.is_default ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-50">{scope.name}</h3>
                      {scope.is_default && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                          Default
                        </span>
                      )}
                      {scope.chatbot_count !== undefined && scope.chatbot_count > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300">
                          {scope.chatbot_count} chatbot{scope.chatbot_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-400">{scope.description || 'No description'}</p>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} />
                        {formatRelativeTime(scope.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(scope); }}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"
                    title="Edit scope"
                  >
                    <Edit2 size={18} />
                  </button>
                  {!scope.is_default && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteScope(scope); }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"
                      title="Delete scope"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  {expandedScopeId === scope.id ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedScopeId === scope.id && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* System Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">System Prompt</label>
                      <button
                        onClick={() => copyPromptToClipboard(scope.system_prompt, scope.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        {copiedId === scope.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === scope.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                        {scope.system_prompt}
                      </pre>
                    </div>
                  </div>

                  {/* Regenerate Section */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-300 block mb-2">
                        Regenerate with context (optional)
                      </label>
                      <input
                        type="text"
                        value={regenerateContext}
                        onChange={(e) => setRegenerateContext(e.target.value)}
                        placeholder="e.g., Make it more friendly, add pricing info..."
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => handleRegeneratePrompt(scope)}
                      disabled={regenerating === scope.id}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <RefreshCw size={18} className={regenerating === scope.id ? 'animate-spin' : ''} />
                      {regenerating === scope.id ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    {scope.prompt_history.length > 0 && (
                      <button
                        onClick={() => handleRestoreLastSaved(scope)}
                        className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 flex items-center gap-2"
                      >
                        <RotateCcw size={18} />
                        Restore Previous
                      </button>
                    )}
                  </div>

                  {/* History Info */}
                  {scope.prompt_history.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {scope.prompt_history.length} previous version{scope.prompt_history.length !== 1 ? 's' : ''} saved
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Scope Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-slate-50 mb-4">Create New Scope</h3>
            <p className="text-sm text-slate-400 mb-4">
              Define a role for your chatbot. The system prompt will be automatically generated from your description.
            </p>

            <form onSubmit={handleCreateScope} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Scope Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Technical Support, Onboarding"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Describe what this chatbot role should do. This will be used to generate the system prompt."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Scope'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ name: '', description: '' });
                    setError('');
                  }}
                  disabled={creating}
                  className="flex-1 bg-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Scope Modal */}
      {showEditModal && selectedScope && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-slate-50 mb-4">Edit Scope: {selectedScope.name}</h3>

            <form onSubmit={handleUpdateScope} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Scope Name *
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  System Prompt
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Use {'{brand_name}'}, {'{support_email}'}, {'{brand_website}'}, {'{context}'}, {'{history}'}, {'{query}'} as placeholders.
                </p>
                <textarea
                  value={editForm.system_prompt || ''}
                  onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedScope(null);
                    setError('');
                  }}
                  disabled={updating}
                  className="flex-1 bg-slate-700 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
