import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, RefreshCw, RotateCcw, Bot, Sparkles, ChevronDown, ChevronUp, Copy, Check, Clock, Lock, GitBranch } from 'lucide-react';
import { apiService } from '../../services/api';
import type { Persona, PersonaCreate, PersonaUpdate } from '../../types';

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

export const PersonasPage: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [expandedPersonaId, setExpandedPersonaId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [personaToClone, setPersonaToClone] = useState<Persona | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cloning, setCloning] = useState(false);

  // Form state for create
  const [createForm, setCreateForm] = useState<PersonaCreate>({
    name: '',
    description: '',
  });

  // Form state for edit
  const [editForm, setEditForm] = useState<PersonaUpdate>({
    name: '',
    description: '',
    system_prompt: '',
  });

  // Regenerate context
  const [regenerateContext, setRegenerateContext] = useState('');

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPersonas(true);
      setPersonas(data);
      setError('');
    } catch (err: any) {
      console.error('Failed to load personas:', err);
      setError(err.response?.data?.detail || 'Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setError('Persona name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      await apiService.createPersona(createForm);
      await loadPersonas();
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create persona');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersona) return;

    try {
      setUpdating(true);
      setError('');
      await apiService.updatePersona(selectedPersona.id, editForm);
      await loadPersonas();
      setShowEditModal(false);
      setSelectedPersona(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update persona');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePersona = async (persona: Persona) => {
    if (persona.is_system) {
      setError('System personas cannot be deleted. Clone it to create an editable copy.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${persona.name}"? Chatbots using this persona will lose their persona assignment.`)) {
      return;
    }

    try {
      await apiService.deletePersona(persona.id);
      await loadPersonas();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete persona');
    }
  };

  const openCloneModal = (persona: Persona) => {
    setPersonaToClone(persona);
    setCloneName(`${persona.name} (Custom)`);
    setShowCloneModal(true);
  };

  const handleClonePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaToClone) return;

    try {
      setCloning(true);
      setError('');
      await apiService.clonePersona(personaToClone.id, cloneName || undefined);
      await loadPersonas();
      setShowCloneModal(false);
      setPersonaToClone(null);
      setCloneName('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to clone persona');
    } finally {
      setCloning(false);
    }
  };

  const handleRegeneratePrompt = async (persona: Persona) => {
    try {
      setRegenerating(persona.id);
      setError('');
      const updatedPersona = await apiService.regeneratePersonaPrompt(persona.id, { context: regenerateContext || undefined });
      // Update just the regenerated persona in state without reloading all personas
      setPersonas(prev => prev.map(p => p.id === updatedPersona.id ? { ...p, ...updatedPersona } : p));
      setRegenerateContext('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to regenerate prompt');
    } finally {
      setRegenerating(null);
    }
  };

  const handleRestoreLastSaved = async (persona: Persona) => {
    if (persona.prompt_history.length === 0) {
      setError('No previous versions available');
      return;
    }

    try {
      const updatedPersona = await apiService.restorePersonaToLastSaved(persona.id);
      // Update just the restored persona in state without reloading all personas
      setPersonas(prev => prev.map(p => p.id === updatedPersona.id ? { ...p, ...updatedPersona } : p));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to restore');
    }
  };

  const openEditModal = (persona: Persona) => {
    if (persona.is_system) {
      setError('System personas cannot be edited. Clone it to create an editable copy.');
      return;
    }
    setSelectedPersona(persona);
    setEditForm({
      name: persona.name,
      description: persona.description || '',
      system_prompt: persona.system_prompt,
    });
    setShowEditModal(true);
  };

  const copyPromptToClipboard = async (prompt: string, personaId: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(personaId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpanded = (personaId: string) => {
    setExpandedPersonaId(expandedPersonaId === personaId ? null : personaId);
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
            <h1 className="text-2xl font-bold text-slate-50">Personas</h1>
            <p className="text-slate-400 text-sm mt-0.5">Configure role-based prompts for your chatbots</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Create Persona
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Personas List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            Loading personas...
          </div>
        ) : personas.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
            <Sparkles size={48} className="mx-auto mb-4 text-slate-500" />
            <p>No personas available. System default personas should appear automatically.</p>
            <p className="text-sm mt-2">Click "Create Persona" to add a custom persona.</p>
          </div>
        ) : (
          personas.map((persona) => (
            <div key={persona.id} className={`bg-slate-800 rounded-lg overflow-hidden ${persona.is_system ? 'border border-purple-500/30' : ''}`}>
              {/* Persona Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50"
                onClick={() => toggleExpanded(persona.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    persona.is_system ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {persona.is_system ? <Lock size={20} /> : <Bot size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-50">{persona.name}</h3>
                      {persona.is_system && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                          <Lock size={10} />
                          System Default
                        </span>
                      )}
                      {!persona.is_system && persona.default_prompt && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                          Cloned
                        </span>
                      )}
                      {persona.chatbot_count !== undefined && persona.chatbot_count > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300">
                          {persona.chatbot_count} chatbot{persona.chatbot_count !== 1 ? 's' : ''}
                        </span>
                      )}
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
                  {/* Clone button for system personas */}
                  {persona.is_system && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openCloneModal(persona); }}
                      className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg"
                      title="Clone to create editable copy"
                    >
                      <GitBranch size={18} />
                    </button>
                  )}
                  {/* Edit button only for company personas */}
                  {!persona.is_system && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(persona); }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg"
                      title="Edit persona"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  {/* Delete button only for company personas */}
                  {!persona.is_system && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePersona(persona); }}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg"
                      title="Delete persona"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  {expandedPersonaId === persona.id ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedPersonaId === persona.id && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* System persona info banner */}
                  {persona.is_system && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 flex items-center gap-3">
                      <Lock size={18} className="text-purple-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-purple-300">This is a system default persona (read-only)</p>
                        <p className="text-xs text-slate-400 mt-1">
                          To customize this persona, click the clone button to create your own editable copy.
                        </p>
                      </div>
                      <button
                        onClick={() => openCloneModal(persona)}
                        className="ml-auto px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <GitBranch size={14} />
                        Clone
                      </button>
                    </div>
                  )}

                  {/* System Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-slate-300">System Prompt</label>
                      <button
                        onClick={() => copyPromptToClipboard(persona.system_prompt, persona.id)}
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

                  {/* Regenerate Section - only for company personas */}
                  {!persona.is_system && (
                    <>
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
                          onClick={() => handleRegeneratePrompt(persona)}
                          disabled={regenerating === persona.id}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <RefreshCw size={18} className={regenerating === persona.id ? 'animate-spin' : ''} />
                          {regenerating === persona.id ? 'Regenerating...' : 'Regenerate'}
                        </button>
                        {persona.prompt_history.length > 0 && (
                          <button
                            onClick={() => handleRestoreLastSaved(persona)}
                            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 flex items-center gap-2"
                          >
                            <RotateCcw size={18} />
                            Restore Previous
                          </button>
                        )}
                      </div>

                      {/* History Info */}
                      {persona.prompt_history.length > 0 && (
                        <p className="text-xs text-slate-500">
                          {persona.prompt_history.length} previous version{persona.prompt_history.length !== 1 ? 's' : ''} saved
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Persona Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-slate-50 mb-4">Create New Persona</h3>
            <p className="text-sm text-slate-400 mb-4">
              Define a role for your chatbot. The system prompt will be automatically generated from your description.
            </p>

            <form onSubmit={handleCreatePersona} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Persona Name *
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
                  {creating ? 'Creating...' : 'Create Persona'}
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

      {/* Edit Persona Modal */}
      {showEditModal && selectedPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-slate-50 mb-4">Edit Persona: {selectedPersona.name}</h3>

            <form onSubmit={handleUpdatePersona} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Persona Name *
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
                    setSelectedPersona(null);
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

      {/* Clone Persona Modal */}
      {showCloneModal && personaToClone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <GitBranch size={20} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-50">Clone Persona</h3>
                <p className="text-sm text-slate-400">Create an editable copy of "{personaToClone.name}"</p>
              </div>
            </div>

            <form onSubmit={handleClonePersona} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  New Persona Name
                </label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder={`${personaToClone.name} (Custom)`}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave blank to use default name
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                <p className="text-sm text-slate-300 mb-2">This will create a copy that you can:</p>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <Edit2 size={12} className="text-blue-400" />
                    Edit the name, description, and system prompt
                  </li>
                  <li className="flex items-center gap-2">
                    <RefreshCw size={12} className="text-purple-400" />
                    Regenerate the prompt with custom context
                  </li>
                  <li className="flex items-center gap-2">
                    <RotateCcw size={12} className="text-slate-400" />
                    Restore to the original default at any time
                  </li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={cloning}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cloning ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Cloning...
                    </>
                  ) : (
                    <>
                      <GitBranch size={16} />
                      Clone Persona
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCloneModal(false);
                    setPersonaToClone(null);
                    setCloneName('');
                    setError('');
                  }}
                  disabled={cloning}
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
