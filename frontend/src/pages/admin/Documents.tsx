import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Link as LinkIcon,
  Trash2,
  FileText,
  Download,
  Filter,
  X,
  Edit,
  MoreVertical,
  Globe,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import type { Document, Chatbot } from '../../types';

// Utility functions
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  if (kb >= 1) return `${kb.toFixed(2)} KB`;
  return `${bytes} bytes`;
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [chatbotFilter, setChatbotFilter] = useState<string>('all');
  const [sharingFilter, setSharingFilter] = useState<string>('all');
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadIsShared, setUploadIsShared] = useState(true);

  // URL form state
  const [url, setUrl] = useState('');
  const [urlIsShared, setUrlIsShared] = useState(true);

  // Edit form state
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>(''); // Track original to detect changes
  const [editCategory, setEditCategory] = useState<string>('');
  const [editIsShared, setEditIsShared] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadChatbots();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

      // Upload document with is_shared setting
      await apiService.uploadDocument(selectedFile, undefined, uploadIsShared);
      toast.success('Document uploaded successfully!');

      await loadDocuments();
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadIsShared(true); // Reset for next upload
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

      // Upload URL with is_shared setting
      await apiService.addDocumentFromUrl(url, undefined, urlIsShared);
      toast.success('Document added from URL successfully!');

      await loadDocuments();
      setShowUrlModal(false);
      setUrl('');
      setUrlIsShared(true); // Reset for next upload
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
      setEditIsShared(doc.is_shared !== false);
      setShowEditModal(true);
      setLoadingContent(true);

      // Fetch document content
      const content = await apiService.getDocumentContent(doc.id);
      setEditContent(content);
      setOriginalContent(content); // Store original to detect changes
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

    const contentChanged = editContent !== originalContent;

    // Show confirmation if content changed (will trigger re-embedding)
    if (contentChanged) {
      const confirmed = confirm(
        'Content has been modified. This will regenerate all embeddings for this document.\n\n' +
        'This process may take a moment. Continue?'
      );
      if (!confirmed) return;
    }

    try {
      setUploading(true);

      // Prepare update data - only include changed fields
      const updateData: any = {};

      if (editTitle !== editingDocument.title) {
        updateData.title = editTitle;
      }

      // Only send content if it has actually changed (avoids unnecessary re-embedding)
      if (contentChanged) {
        updateData.content = editContent;
      }

      if (editCategory !== editingDocument.category) {
        updateData.category = editCategory;
      }

      // Update document if there are changes
      if (Object.keys(updateData).length > 0) {
        await apiService.updateDocument(editingDocument.id, updateData);
      }

      // Update sharing status if changed
      const currentIsShared = editingDocument.is_shared !== false;
      if (editIsShared !== currentIsShared) {
        await apiService.updateDocumentSharing(editingDocument.id, editIsShared);
      }

      // Show appropriate success message
      toast.success(contentChanged
        ? 'Document updated and embeddings regenerated!'
        : 'Document updated successfully!');

      await loadDocuments();
      setShowEditModal(false);
      setEditingDocument(null);
      setOriginalContent(''); // Reset
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

  // Get unique categories from documents
  const categories = Array.from(new Set(documents.map(d => d.category).filter(Boolean))) as string[];

  const filteredDocuments = documents.filter(doc => {
    // Sharing filter
    if (sharingFilter === 'shared' && doc.is_shared !== true) return false;
    if (sharingFilter === 'specific' && doc.is_shared === true) return false;

    // Category filter
    if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;

    // Chatbot filter
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
    <div className="space-y-6 flex flex-col h-full">
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

          {/* Sharing Filter */}
          <select
            value={sharingFilter}
            onChange={(e) => setSharingFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All ({documents.length})</option>
            <option value="shared">Shared KB ({documents.filter(d => d.is_shared !== false).length})</option>
            <option value="specific">Chatbot-Specific ({documents.filter(d => d.is_shared === false).length})</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
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

          {(sharingFilter !== 'all' || categoryFilter !== 'all' || chatbotFilter !== 'all') && (
            <button
              onClick={() => {
                setSharingFilter('all');
                setCategoryFilter('all');
                setChatbotFilter('all');
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex-1 flex flex-col min-h-[400px]">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
            <FileText className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No documents found</h3>
            <p className="text-slate-400 mb-6">
              {sharingFilter !== 'all' || categoryFilter !== 'all' || chatbotFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first document to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Chunks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredDocuments.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm text-slate-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="font-medium text-white text-sm truncate max-w-[200px]" title={doc.title}>
                          {doc.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                        {doc.file_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {doc.category ? (
                        <span className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {doc.category}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {doc.chunk_count ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      {doc.is_shared !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
                          <Globe className="w-3 h-3" />
                          Shared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs">
                          <Lock className="w-3 h-3" />
                          Specific
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative" ref={openActionMenu === doc.id ? actionMenuRef : null}>
                        <button
                          onClick={() => setOpenActionMenu(openActionMenu === doc.id ? null : doc.id)}
                          className="p-2 hover:bg-slate-600 rounded transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        <AnimatePresence>
                          {openActionMenu === doc.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute right-0 mt-1 w-40 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10"
                            >
                              <button
                                onClick={() => {
                                  handleEdit(doc);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors rounded-t-lg"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              {doc.download_url && (
                                <button
                                  onClick={() => {
                                    handleDownload(doc);
                                    setOpenActionMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleDelete(doc.id);
                                  setOpenActionMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-600 transition-colors rounded-b-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          uploading={uploading}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          isShared={uploadIsShared}
          setIsShared={setUploadIsShared}
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
          isShared={urlIsShared}
          setIsShared={setUrlIsShared}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <EditModal
          document={editingDocument}
          onClose={() => {
            setShowEditModal(false);
            setEditingDocument(null);
            setOriginalContent('');
          }}
          onUpdate={handleUpdateDocument}
          uploading={uploading}
          loadingContent={loadingContent}
          title={editTitle}
          setTitle={setEditTitle}
          content={editContent}
          setContent={setEditContent}
          originalContent={originalContent}
          category={editCategory}
          setCategory={setEditCategory}
          isShared={editIsShared}
          setIsShared={setEditIsShared}
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
  isShared: boolean;
  setIsShared: (value: boolean) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onUpload,
  uploading,
  selectedFile,
  setSelectedFile,
  isShared,
  setIsShared,
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

          {/* Sharing Option */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Document Access</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsShared(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isShared
                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                Shared KB
              </button>
              <button
                type="button"
                onClick={() => setIsShared(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  !isShared
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Lock className="w-4 h-4" />
                Chatbot-Specific
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isShared
                ? 'Document will be available to all chatbots via shared knowledge base'
                : 'Document will only be accessible to specifically assigned chatbots'}
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
  isShared: boolean;
  setIsShared: (value: boolean) => void;
}

const URLModal: React.FC<URLModalProps> = ({
  onClose,
  onSubmit,
  uploading,
  url,
  setUrl,
  isShared,
  setIsShared,
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

          {/* Sharing Option */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Document Access</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsShared(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isShared
                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Globe className="w-4 h-4" />
                Shared KB
              </button>
              <button
                type="button"
                onClick={() => setIsShared(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  !isShared
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Lock className="w-4 h-4" />
                Chatbot-Specific
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isShared
                ? 'Document will be available to all chatbots via shared knowledge base'
                : 'Document will only be accessible to specifically assigned chatbots'}
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
  originalContent: string;
  category: string;
  setCategory: (category: string) => void;
  isShared: boolean;
  setIsShared: (value: boolean) => void;
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
  originalContent,
  category,
  setCategory,
  isShared,
  setIsShared,
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

            {/* Sharing Option */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Document Access</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsShared(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    isShared
                      ? 'bg-green-500/10 border-green-500/50 text-green-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Shared KB
                </button>
                <button
                  type="button"
                  onClick={() => setIsShared(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    !isShared
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Chatbot-Specific
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isShared
                  ? 'Document will be available to all chatbots via shared knowledge base'
                  : 'Document will only be accessible to specifically assigned chatbots'}
              </p>
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

            {/* Info about content updates */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-300">
                <strong>Note:</strong> When you update the content, the document will be automatically re-chunked and re-embedded for optimal search performance.
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
                {content !== originalContent ? 'Updating & Regenerating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                {content !== originalContent ? 'Update & Regenerate Embeddings' : 'Update Document'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
