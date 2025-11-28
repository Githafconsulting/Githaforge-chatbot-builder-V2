import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  FileText,
  Download,
  Tag,
  Bot,
  Filter,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import type { Document, Chatbot } from '../../types';

const SCOPES = [
  { value: 'sales', label: 'Sales', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { value: 'support', label: 'Support', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'product', label: 'Product', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'billing', label: 'Billing', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { value: 'hr', label: 'HR', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { value: 'legal', label: 'Legal', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { value: 'marketing', label: 'Marketing', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { value: 'general', label: 'General', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
];

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [chatbotFilter, setChatbotFilter] = useState<string>('all');

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadScope, setUploadScope] = useState<string>('general');
  const [uploadChatbot, setUploadChatbot] = useState<string>('shared');
  const [uploadCategory, setUploadCategory] = useState<string>('');

  // URL form state
  const [url, setUrl] = useState('');
  const [urlScope, setUrlScope] = useState<string>('general');
  const [urlChatbot, setUrlChatbot] = useState<string>('shared');
  const [urlCategory, setUrlCategory] = useState('');

  useEffect(() => {
    loadDocuments();
    loadChatbots();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      const documentsList = Array.isArray(data) ? data : (data.documents || []);
      setDocuments(documentsList);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadChatbots = async () => {
    try {
      const response = await apiService.getChatbots();
      // Handle both array and object response formats
      const chatbotsList = Array.isArray(response) ? response : (response.chatbots || []);
      setChatbots(chatbotsList);
    } catch (error) {
      console.error('Failed to load chatbots:', error);
      setChatbots([]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (uploadCategory) formData.append('category', uploadCategory);
      formData.append('scope', uploadScope);
      if (uploadChatbot !== 'shared') {
        formData.append('chatbot_id', uploadChatbot);
      }

      // Note: We'll need to update the uploadDocument API to accept scope and chatbot_id
      await apiService.uploadDocument(selectedFile, uploadCategory || undefined);
      await loadDocuments();
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadScope('general');
      setUploadChatbot('shared');
      setUploadCategory('');
      toast.success('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    try {
      setUploading(true);
      // Note: We'll need to update the addDocumentFromUrl API to accept scope and chatbot_id
      await apiService.addDocumentFromUrl(url, urlCategory || undefined);
      await loadDocuments();
      setUrl('');
      setUrlScope('general');
      setUrlChatbot('shared');
      setUrlCategory('');
      setShowUrlModal(false);
      toast.success('Document added from URL successfully!');
    } catch (error: any) {
      console.error('Failed to add document from URL:', error);
      toast.error(error.response?.data?.detail || 'Failed to add document from URL');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await apiService.deleteDocument(id);
      await loadDocuments();
      toast.success('Document deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await apiService.downloadDocument(doc.id);
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.response?.data?.detail || 'Failed to download document');
    }
  };

  const getScopeColor = (scope?: string) => {
    const scopeObj = SCOPES.find(s => s.value === scope);
    return scopeObj?.color || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} bytes`;
  };

  const getChatbotName = (chatbotId?: string | null) => {
    if (!chatbotId) return 'Shared';
    const chatbot = chatbots.find(c => c.id === chatbotId);
    return chatbot?.name || 'Unknown';
  };

  const filteredDocuments = documents.filter(doc => {
    if (scopeFilter !== 'all' && doc.scope !== scopeFilter) return false;
    if (chatbotFilter !== 'all') {
      if (chatbotFilter === 'shared' && doc.chatbot_id !== null) return false;
      if (chatbotFilter !== 'shared' && doc.chatbot_id !== chatbotFilter) return false;
    }
    return true;
  });

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
          <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
          <p className="text-slate-400 mt-1">
            Manage documents with scope and chatbot assignment
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUrlModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Add from URL
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Filters:</span>
          </div>

          {/* Scope Filter */}
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Scopes</option>
            {SCOPES.map(scope => (
              <option key={scope.value} value={scope.value}>{scope.label}</option>
            ))}
          </select>

          {/* Chatbot Filter */}
          <select
            value={chatbotFilter}
            onChange={(e) => setChatbotFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Chatbots</option>
            <option value="shared">Shared (All Chatbots)</option>
            {chatbots.map(chatbot => (
              <option key={chatbot.id} value={chatbot.id}>{chatbot.name}</option>
            ))}
          </select>

          {(scopeFilter !== 'all' || chatbotFilter !== 'all') && (
            <button
              onClick={() => {
                setScopeFilter('all');
                setChatbotFilter('all');
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white text-sm truncate">{doc.title}</h3>
              </div>
              <div className="flex gap-1">
                {doc.download_url && (
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {doc.scope && (
                <span className={`text-xs px-2 py-0.5 rounded border ${getScopeColor(doc.scope)} flex items-center gap-1`}>
                  <Tag className="w-3 h-3" />
                  {SCOPES.find(s => s.value === doc.scope)?.label || doc.scope}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded border bg-slate-700/50 text-slate-300 border-slate-600 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                {getChatbotName(doc.chatbot_id)}
              </span>
            </div>

            {/* Summary */}
            {doc.summary && (
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{doc.summary}</p>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{doc.file_type.toUpperCase()}</span>
              <span>{formatFileSize(doc.file_size)}</span>
              <span>{doc.chunk_count} chunks</span>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No documents found</h3>
          <p className="text-slate-400 mb-6">
            {scopeFilter !== 'all' || chatbotFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first document to get started'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          uploading={uploading}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          scope={uploadScope}
          setScope={setUploadScope}
          chatbot={uploadChatbot}
          setChatbot={setUploadChatbot}
          category={uploadCategory}
          setCategory={setUploadCategory}
          chatbots={chatbots}
          scopes={SCOPES}
        />
      )}

      {/* URL Modal */}
      {showUrlModal && (
        <URLModal
          onClose={() => setShowUrlModal(false)}
          onSubmit={handleUrlSubmit}
          uploading={uploading}
          url={url}
          setUrl={setUrl}
          scope={urlScope}
          setScope={setUrlScope}
          chatbot={urlChatbot}
          setChatbot={setUrlChatbot}
          category={urlCategory}
          setCategory={setUrlCategory}
          chatbots={chatbots}
          scopes={SCOPES}
        />
      )}
    </div>
  );
};

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onUpload: () => void;
  uploading: boolean;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  scope: string;
  setScope: (scope: string) => void;
  chatbot: string;
  setChatbot: (chatbot: string) => void;
  category: string;
  setCategory: (category: string) => void;
  chatbots: Chatbot[];
  scopes: typeof SCOPES;
}

const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onUpload,
  uploading,
  selectedFile,
  setSelectedFile,
  scope,
  setScope,
  chatbot,
  setChatbot,
  category,
  setCategory,
  chatbots,
  scopes,
}) => {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Upload Document</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">File</label>
            <input
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {scopes.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Assign to Chatbot</label>
            <select
              value={chatbot}
              onChange={(e) => setChatbot(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="shared">Shared (All Chatbots)</option>
              {chatbots.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Shared documents are available to all chatbots in your company
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category (optional)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., FAQ, Policy"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onUpload}
              disabled={uploading || !selectedFile}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// URL Modal Component (similar to Upload Modal)
interface URLModalProps {
  onClose: () => void;
  onSubmit: () => void;
  uploading: boolean;
  url: string;
  setUrl: (url: string) => void;
  scope: string;
  setScope: (scope: string) => void;
  chatbot: string;
  setChatbot: (chatbot: string) => void;
  category: string;
  setCategory: (category: string) => void;
  chatbots: Chatbot[];
  scopes: typeof SCOPES;
}

const URLModal: React.FC<URLModalProps> = ({
  onClose,
  onSubmit,
  uploading,
  url,
  setUrl,
  scope,
  setScope,
  chatbot,
  setChatbot,
  category,
  setCategory,
  chatbots,
  scopes,
}) => {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Add from URL</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {scopes.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Assign to Chatbot</label>
            <select
              value={chatbot}
              onChange={(e) => setChatbot(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="shared">Shared (All Chatbots)</option>
              {chatbots.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category (optional)</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., FAQ, Policy"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={uploading || !url}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Add Document
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
