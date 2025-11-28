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
  Edit,
  List,
  Grid3x3,
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

// Utility functions
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

const getChatbotName = (chatbotId: string | null, chatbots: Chatbot[]): string => {
  if (!chatbotId) return 'Shared (All Chatbots)';
  const chatbot = chatbots.find(c => c.id === chatbotId);
  return chatbot?.name || 'Unknown';
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [chatbotFilter, setChatbotFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // URL form state
  const [url, setUrl] = useState('');

  // Edit form state
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadChatbots();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
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

      // Upload document - backend will auto-classify
      const result = await apiService.uploadDocument(selectedFile);

      // Show classification result
      if (result.scope && result.classification_confidence) {
        const confidence = (result.classification_confidence * 100).toFixed(0);
        const scopeLabel = SCOPES.find(s => s.value === result.scope)?.label || result.scope;
        toast.success(`Document classified as "${scopeLabel}" (${confidence}% confidence)`, { duration: 4000 });
      } else {
        toast.success('Document uploaded successfully!');
      }

      await loadDocuments();
      setShowUploadModal(false);
      setSelectedFile(null);
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

      // Upload URL - backend will auto-classify
      const result = await apiService.addDocumentFromUrl(url, undefined);

      // Show classification result
      if (result.scope && result.classification_confidence) {
        const confidence = (result.classification_confidence * 100).toFixed(0);
        const scopeLabel = SCOPES.find(s => s.value === result.scope)?.label || result.scope;
        toast.success(`Document classified as "${scopeLabel}" (${confidence}% confidence)`, { duration: 4000 });
      } else {
        toast.success('Document added from URL successfully!');
      }

      await loadDocuments();
      setShowUrlModal(false);
      setUrl('');
    } catch (error: any) {
      console.error('Failed to add document from URL:', error);
      toast.error(error.response?.data?.detail || 'Failed to add document from URL');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (doc: Document) => {
    try {
      setEditingDocument(doc);
      setEditTitle(doc.title);
      setEditCategory(doc.category || '');
      setShowEditModal(true);
      setLoadingContent(true);

      // Fetch document content
      const content = await apiService.getDocumentContent(doc.id);
      setEditContent(content);
    } catch (error: any) {
      console.error('Failed to load document content:', error);
      toast.error('Failed to load document content');
      setShowEditModal(false);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    try {
      setUploading(true);

      // Prepare update data - content change triggers AI re-classification
      const updateData: any = {};

      if (editTitle !== editingDocument.title) {
        updateData.title = editTitle;
      }

      if (editContent) {
        updateData.content = editContent;
      }

      if (editCategory !== editingDocument.category) {
        updateData.category = editCategory;
      }

      const result = await apiService.updateDocument(editingDocument.id, updateData);

      // Show AI re-classification result if content was updated
      if (updateData.content && result.scope && result.classification_confidence) {
        const confidence = (result.classification_confidence * 100).toFixed(0);
        const scopeLabel = SCOPES.find(s => s.value === result.scope)?.label || result.scope;
        toast.success(`Document updated and re-classified as "${scopeLabel}" (${confidence}% confidence)`, { duration: 4000 });
      } else {
        toast.success('Document updated successfully!');
      }

      await loadDocuments();
      setShowEditModal(false);
      setEditingDocument(null);
    } catch (error: any) {
      console.error('Failed to update document:', error);
      toast.error(error.response?.data?.detail || 'Failed to update document');
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
        <div className="flex items-center justify-between">
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

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Documents - List/Grid View */}
      {viewMode === 'list' ? (
        // List View
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Title and Metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <h3 className="font-semibold text-white text-sm truncate">{doc.title}</h3>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {doc.scope && (
                      <span className={`text-xs px-2 py-0.5 rounded border ${getScopeColor(doc.scope)} flex items-center gap-1`}>
                        <Tag className="w-3 h-3" />
                        {SCOPES.find(s => s.value === doc.scope)?.label || doc.scope}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded border bg-slate-700/50 text-slate-300 border-slate-600 flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {getChatbotName(doc.chatbot_id, chatbots)}
                    </span>
                    {doc.auto_classified && doc.classification_confidence && (
                      <span className="text-xs px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 flex items-center gap-1" title={`AI Confidence: ${(doc.classification_confidence * 100).toFixed(0)}%`}>
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                        AI Classified
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 text-slate-500">
                      {doc.file_type.toUpperCase()} • {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks
                    </span>
                  </div>

                  {/* Categories and Topics */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.categories && doc.categories.length > 0 && (
                      <>
                        {doc.categories.slice(0, 5).map((cat, idx) => (
                          <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {cat}
                          </span>
                        ))}
                        {doc.categories.length > 5 && (
                          <span className="text-xs px-1.5 py-0.5 text-slate-400">
                            +{doc.categories.length - 5} more
                          </span>
                        )}
                      </>
                    )}
                    {doc.topics && doc.topics.length > 0 && (
                      <>
                        {doc.topics.slice(0, 5).map((topic, idx) => (
                          <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            #{topic}
                          </span>
                        ))}
                        {doc.topics.length > 5 && (
                          <span className="text-xs px-1.5 py-0.5 text-slate-400">
                            +{doc.topics.length - 5} more
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Summary */}
                  {doc.summary && (
                    <p className="text-xs text-slate-400 line-clamp-1">{doc.summary}</p>
                  )}
                </div>

                {/* Right: Action Buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(doc)}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
                  {doc.download_url && (
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        // Grid View
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
                  <button
                    onClick={() => handleEdit(doc)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
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
                  {getChatbotName(doc.chatbot_id, chatbots)}
                </span>
                {doc.auto_classified && doc.classification_confidence && (
                  <span className="text-xs px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 flex items-center gap-1" title={`AI Confidence: ${(doc.classification_confidence * 100).toFixed(0)}%`}>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                    AI Classified
                  </span>
                )}
              </div>

              {/* Categories */}
              {doc.categories && doc.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {doc.categories.slice(0, 3).map((cat, idx) => (
                    <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {cat}
                    </span>
                  ))}
                  {doc.categories.length > 3 && (
                    <span className="text-xs px-1.5 py-0.5 text-slate-400">
                      +{doc.categories.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Topics */}
              {doc.topics && doc.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {doc.topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      #{topic}
                    </span>
                  ))}
                  {doc.topics.length > 3 && (
                    <span className="text-xs px-1.5 py-0.5 text-slate-400">
                      +{doc.topics.length - 3} more
                    </span>
                  )}
                </div>
              )}

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
      )}

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
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <EditModal
          document={editingDocument}
          onClose={() => {
            setShowEditModal(false);
            setEditingDocument(null);
          }}
          onUpdate={handleUpdateDocument}
          uploading={uploading}
          loadingContent={loadingContent}
          title={editTitle}
          setTitle={setEditTitle}
          content={editContent}
          setContent={setEditContent}
          category={editCategory}
          setCategory={setEditCategory}
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
}

const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onUpload,
  uploading,
  selectedFile,
  setSelectedFile,
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

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              <strong>Shared Knowledge Base:</strong> This document will be added to your company's shared knowledge base and automatically classified by AI into scopes, categories, and topics. Each chatbot will access relevant documents based on its scope configuration.
            </p>
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
  
}

const URLModal: React.FC<URLModalProps> = ({
  onClose,
  onSubmit,
  uploading,
  url,
  setUrl,
  
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

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              <strong>Shared Knowledge Base:</strong> This document will be added to your company's shared knowledge base and automatically classified by AI into scopes, categories, and topics. Each chatbot will access relevant documents based on its scope configuration.
            </p>
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

// Edit Modal Component
interface EditModalProps {
  document: Document;
  onClose: () => void;
  onUpdate: () => void;
  uploading: boolean;
  loadingContent: boolean;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  category: string;
  setCategory: (category: string) => void;
}

const EditModal: React.FC<EditModalProps> = ({
  document,
  onClose,
  onUpdate,
  uploading,
  loadingContent,
  title,
  setTitle,
  content,
  setContent,
  category,
  setCategory,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Document</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {loadingContent ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full"
            />
            <span className="ml-3 text-slate-400">Loading document content...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Classification Info */}
            {document.scope && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300 mb-2">Current Classification</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded border ${getScopeColor(document.scope)} flex items-center gap-1`}>
                        <Tag className="w-3 h-3" />
                        {SCOPES.find(s => s.value === document.scope)?.label || document.scope}
                      </span>
                      {document.auto_classified && document.classification_confidence && (
                        <span className="text-xs px-2 py-1 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                          AI: {(document.classification_confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category (Optional)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No category</option>
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="product">Product</option>
                <option value="policy">Policy</option>
                <option value="faq">FAQ</option>
                <option value="guide">Guide</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter document content..."
              />
              <p className="text-xs text-slate-500 mt-1">
                {content.length} characters
              </p>
            </div>

            {/* AI Re-classification Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-300">
                <strong>AI Re-classification:</strong> When you update the content, the document will be automatically re-chunked, re-embedded, and re-classified by AI into the appropriate scope, categories, and topics.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            disabled={uploading || loadingContent || !content.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                />
                Updating & Re-classifying...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Update Document
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
