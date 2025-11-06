import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Link as LinkIcon, Trash2, FileText, ExternalLink, Database, Files, Calendar, Layers, CheckCircle, AlertCircle, X, Download, HardDrive, Sparkles, ThumbsUp, ThumbsDown, Eye, Loader2, Edit } from 'lucide-react';
import { apiService } from '../../services/api';
import type { Document, DraftDocument } from '../../types';
import { staggerContainer, staggerItem } from '../../utils/animations';

type TabType = 'documents' | 'drafts';

export const DocumentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [drafts, setDrafts] = useState<DraftDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocEditModal, setShowDocEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftDocument | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewContent, setViewContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'upload' | 'url' | 'draft_published'>('all');

  useEffect(() => {
    loadDocuments();
    loadDrafts(); // Load drafts automatically on mount
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDocuments();
      // Handle both array and object responses
      const documentsList = Array.isArray(data) ? data : (data.documents || []);
      setDocuments(documentsList);
      setError('');
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await apiService.uploadDocument(file, category || undefined);
      await loadDocuments();
      e.target.value = '';
      setCategory('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    try {
      setUploading(true);
      await apiService.addDocumentFromUrl(url, category || undefined);
      await loadDocuments();
      setUrl('');
      setCategory('');
      setShowUrlModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add document from URL');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await apiService.downloadDocument(doc.id);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.response?.data?.detail || 'Failed to download document');
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} bytes`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await apiService.deleteDocument(id);
      await loadDocuments();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete document');
    }
  };

  const loadDrafts = async () => {
    try {
      setDraftsLoading(true);
      const response = await apiService.getPendingDrafts({ status: 'pending', limit: 50 });
      setDrafts(response.drafts || []);
      setError('');
    } catch (err: any) {
      console.error('Drafts error:', err);
      setError(err.response?.data?.detail || 'Failed to load drafts');
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleReviewDraft = async (draft: DraftDocument, action: 'approve' | 'reject') => {
    setSelectedDraft(draft);
    setReviewAction(action);
    setShowDraftModal(true);
  };

  const submitReview = async () => {
    if (!selectedDraft || !reviewAction) return;

    try {
      setUploading(true);
      if (reviewAction === 'approve') {
        await apiService.approveDraft(selectedDraft.id, {
          status: 'approved',
          review_notes: reviewNotes.trim() || undefined,
        });
        alert('Draft approved! It has been added to the knowledge base.');
      } else {
        await apiService.rejectDraft(selectedDraft.id, {
          status: 'rejected',
          review_notes: reviewNotes.trim() || undefined,
        });
        alert('Draft rejected.');
      }
      await loadDrafts();
      setShowDraftModal(false);
      setSelectedDraft(null);
      setReviewNotes('');
      setReviewAction(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setUploading(false);
    }
  };

  const handleEditDraft = (draft: DraftDocument) => {
    setSelectedDraft(draft);
    setEditedTitle(draft.title);
    setEditedContent(draft.content);
    setEditedCategory(draft.category || '');
    setShowEditModal(true);
  };

  const submitEdit = async () => {
    if (!selectedDraft) return;

    try {
      setUploading(true);
      await apiService.updateDraft(selectedDraft.id, {
        title: editedTitle,
        content: editedContent,
        category: editedCategory || undefined,
      });
      await loadDrafts();
      setShowEditModal(false);
      setSelectedDraft(null);
      setEditedTitle('');
      setEditedContent('');
      setEditedCategory('');
      alert('Draft updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update draft');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? It can be recovered from Trash within 30 days.')) return;

    try {
      await apiService.softDeleteDraft(draftId);
      await loadDrafts();
      alert('Draft soft-deleted successfully! You can recover it from Trash within 30 days.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete draft');
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      setSelectedDocument(doc);
      setShowViewModal(true);
      setViewContent('Loading full content...');
      setUploading(true);

      // Fetch full content from backend
      const fullContent = await apiService.getDocumentContent(doc.id);
      setViewContent(fullContent);
      setUploading(false);
    } catch (err: any) {
      console.error('Failed to load document content:', err);
      setError('Failed to load full document content');
      setViewContent(doc.summary || ''); // Fallback to summary
      setUploading(false);
    }
  };

  const handleEditDocument = async (doc: Document) => {
    try {
      setSelectedDocument(doc);
      setEditedTitle(doc.title);
      setEditedCategory(doc.category || '');

      // Show modal with loading state
      setShowDocEditModal(true);
      setEditedContent('Loading full content...');
      setUploading(true);

      // Fetch full content from backend
      const fullContent = await apiService.getDocumentContent(doc.id);
      setEditedContent(fullContent);
      setUploading(false);
    } catch (err: any) {
      console.error('Failed to load document content:', err);
      setError('Failed to load full document content');
      setEditedContent(doc.summary || ''); // Fallback to summary
      setUploading(false);
    }
  };

  const submitDocumentEdit = async () => {
    if (!selectedDocument) return;

    try {
      setUploading(true);
      await apiService.updateDocument(selectedDocument.id, {
        title: editedTitle,
        content: editedContent,
        category: editedCategory || undefined,
      });
      await loadDocuments();
      setShowDocEditModal(false);
      setSelectedDocument(null);
      setEditedTitle('');
      setEditedContent('');
      setEditedCategory('');
      alert('Document updated successfully! Embeddings regenerated.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update document');
    } finally {
      setUploading(false);
    }
  };

  // Filter documents by source_type
  const filteredDocuments = sourceTypeFilter === 'all'
    ? documents
    : documents.filter(doc => doc.source_type === sourceTypeFilter);

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-50">Knowledge Base</h1>
              <p className="text-slate-400 text-sm mt-0.5">Manage documents and review AI-generated drafts</p>
            </div>
          </div>

          {activeTab === 'documents' && (
            <div className="flex gap-3">
              <motion.label
                className="btn-primary cursor-pointer flex items-center gap-2 px-6 py-3 rounded-xl shadow-md"
                whileHover={{ scale: 1.05, boxShadow: '0 8px 20px -5px rgba(30, 64, 175, 0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                <Upload size={20} />
                {uploading ? 'Uploading...' : 'Upload File'}
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </motion.label>

              <motion.button
                onClick={() => setShowUrlModal(true)}
                className="btn-secondary flex items-center gap-2 px-6 py-3 rounded-xl shadow-md"
                whileHover={{ scale: 1.05, boxShadow: '0 8px 20px -5px rgba(14, 165, 233, 0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                <LinkIcon size={20} />
                Add from URL
              </motion.button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'documents'
                ? 'text-primary-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Files size={18} className="inline mr-2" />
            Documents ({filteredDocuments.length})
            {activeTab === 'documents' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'drafts'
                ? 'text-primary-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={18} className="inline mr-2" />
            Pending Drafts ({drafts.length})
            {activeTab === 'drafts' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400"
              />
            )}
          </button>
        </div>

        {/* Filter Dropdown - Only show for Documents tab */}
        {activeTab === 'documents' && (
          <div className="flex items-center gap-3 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <label className="text-sm font-medium text-slate-300">Filter by Source:</label>
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Documents ({documents.length})</option>
              <option value="upload">Manually Uploaded ({documents.filter(d => d.source_type === 'upload').length})</option>
              <option value="url">From URL ({documents.filter(d => d.source_type === 'url').length})</option>
              <option value="draft_published">Auto-Published Drafts ({documents.filter(d => d.source_type === 'draft_published').length})</option>
            </select>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-soft"
          >
            <AlertCircle size={20} />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Section - Documents or Drafts */}
      <motion.div
        variants={staggerItem}
        className="card-hover rounded-2xl shadow-soft overflow-hidden"
      >
        {activeTab === 'documents' ? (
          // Documents Tab
          loading ? (
            <div className="p-12 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
              />
              <p className="text-slate-300">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center mx-auto mb-4"
              >
                <FileText size={40} className="text-primary-600" />
              </motion.div>
              <p className="text-slate-300 text-lg">
                {sourceTypeFilter === 'all' ? 'No documents yet' : `No ${sourceTypeFilter === 'draft_published' ? 'auto-published drafts' : sourceTypeFilter === 'upload' ? 'uploaded documents' : 'URL documents'} found`}
              </p>
              <p className="text-slate-400 text-sm mt-2">
                {sourceTypeFilter === 'all' ? 'Upload a file or add from URL to get started' : 'Try changing the filter to see other documents'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              <AnimatePresence>
                {filteredDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            doc.source_type === 'draft_published'
                              ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-br from-primary-500 to-secondary-500'
                          }`}>
                            {doc.source_type === 'draft_published' ? (
                              <Sparkles size={20} className="text-white" />
                            ) : (
                              <FileText size={20} className="text-white" />
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-slate-50 truncate">{doc.title}</h3>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                            doc.source_type === 'draft_published'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-primary-100 text-primary-700'
                          }`}>
                            {doc.source_type === 'draft_published' ? '✨ Auto-Published' : doc.source_type}
                          </span>
                        </div>

                        {doc.summary && (
                          <p className="text-sm text-slate-300 line-clamp-2 mb-3 ml-13">
                            {doc.summary}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slate-400 ml-13 flex-wrap">
                          {doc.file_type && (
                            <span className="flex items-center gap-1">
                              <FileText size={14} />
                              {doc.file_type.toUpperCase()}
                            </span>
                          )}
                          {doc.file_size && (
                            <span className="flex items-center gap-1">
                              <HardDrive size={14} />
                              {formatFileSize(doc.file_size)}
                            </span>
                          )}
                          {doc.chunk_count !== undefined && (
                            <span className="flex items-center gap-1">
                              <Layers size={14} />
                              {doc.chunk_count} chunks
                            </span>
                          )}
                          {doc.category && (
                            <span className="flex items-center gap-1 text-xs bg-secondary-100 text-secondary-700 px-2 py-0.5 rounded-full">
                              {doc.category}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {doc.source_url && (
                          <a
                            href={doc.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-400 hover:text-primary-300 mt-3 inline-flex items-center gap-1 ml-13 font-medium"
                          >
                            View source <ExternalLink size={14} />
                          </a>
                        )}

                        {/* Show "View Source Draft" link for auto-published documents */}
                        {doc.source_type === 'draft_published' && doc.metadata?.draft_id && (
                          <button
                            onClick={() => {
                              // Navigate to Learning page (will be implemented)
                              alert(`Source Draft ID: ${doc.metadata.draft_id}\n\nThis would navigate to the Learning page to show the source draft.`);
                            }}
                            className="text-sm text-yellow-400 hover:text-yellow-300 mt-3 inline-flex items-center gap-1 ml-13 font-medium"
                          >
                            <Sparkles size={14} />
                            View Source Draft
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <motion.button
                          onClick={() => handleViewDocument(doc)}
                          className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-900/20 transition-colors"
                          title="View document content"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Eye size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleEditDocument(doc)}
                          className="text-yellow-400 hover:text-yellow-300 p-2 rounded-lg hover:bg-yellow-900/20 transition-colors"
                          title="Edit document"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Edit size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDownload(doc)}
                          className="text-primary-400 hover:text-primary-300 p-2 rounded-lg hover:bg-primary-900/20 transition-colors"
                          title={doc.source_type === 'draft_published' ? 'Download as text file' : 'Download original file'}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Download size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                          title="Delete document"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 size={20} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          // Drafts Tab
          draftsLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin w-12 h-12 text-primary-400 mx-auto mb-4" />
              <p className="text-slate-300">Loading drafts...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles size={40} className="text-yellow-600" />
              </motion.div>
              <p className="text-slate-300 text-lg">No pending drafts</p>
              <p className="text-slate-400 text-sm mt-2">AI-generated drafts will appear here for review</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              <AnimatePresence>
                {drafts.map((draft, index) => (
                  <motion.div
                    key={draft.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={20} className="text-white" />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-50">{draft.title}</h3>
                          {draft.generated_by_llm && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-full font-medium flex-shrink-0">
                              AI Generated
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-300 line-clamp-2 mb-3 ml-13">
                          {draft.content.substring(0, 200)}...
                        </p>

                        <div className="flex items-center gap-4 text-sm text-slate-400 ml-13 flex-wrap">
                          {draft.query_pattern && (
                            <span className="flex items-center gap-1">
                              Pattern: <strong className="text-slate-300">{draft.query_pattern}</strong>
                            </span>
                          )}
                          {draft.feedback_count && (
                            <span className="flex items-center gap-1">
                              Based on <strong className="text-slate-300">{draft.feedback_count}</strong> feedback
                            </span>
                          )}
                          {draft.confidence_score && (
                            <span className="flex items-center gap-1">
                              Confidence: <strong className="text-slate-300">{(draft.confidence_score * 100).toFixed(0)}%</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(draft.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <motion.button
                          onClick={() => { setSelectedDraft(draft); setShowDraftModal(true); setReviewAction(null); }}
                          className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-900/20 transition-colors"
                          title="Preview draft"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Eye size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleEditDraft(draft)}
                          className="text-yellow-400 hover:text-yellow-300 p-2 rounded-lg hover:bg-yellow-900/20 transition-colors"
                          title="Edit draft"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Edit size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleReviewDraft(draft, 'approve')}
                          className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-green-900/20 transition-colors"
                          title="Approve draft"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <ThumbsUp size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleReviewDraft(draft, 'reject')}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors"
                          title="Reject draft"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <ThumbsDown size={20} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="text-slate-400 hover:text-slate-300 p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          title="Delete draft"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Trash2 size={20} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}
      </motion.div>

      {/* URL Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !uploading && setShowUrlModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-strong"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center">
                    <LinkIcon className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-50">Add from URL</h3>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Document URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/document"
                      className="input w-full"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Category (optional)
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., product-docs, support, etc."
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={handleUrlSubmit}
                    disabled={uploading || !url.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!uploading && url.trim() ? { scale: 1.02 } : {}}
                    whileTap={!uploading && url.trim() ? { scale: 0.98 } : {}}
                  >
                    {uploading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Adding...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Add Document
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowUrlModal(false);
                      setUrl('');
                    }}
                    disabled={uploading}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50"
                    whileHover={!uploading ? { scale: 1.02 } : {}}
                    whileTap={!uploading ? { scale: 0.98 } : {}}
                  >
                    <X size={20} />
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Draft Review Modal */}
      <AnimatePresence>
        {showDraftModal && selectedDraft && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !uploading && setShowDraftModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-800 rounded-2xl p-8 max-w-4xl w-full shadow-strong max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-slate-50">{selectedDraft.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedDraft.generated_by_llm && `Generated by ${selectedDraft.llm_model || 'AI'}`}
                      {selectedDraft.query_pattern && ` • Pattern: ${selectedDraft.query_pattern}`}
                      {selectedDraft.feedback_count && ` • Based on ${selectedDraft.feedback_count} feedback`}
                    </p>
                  </div>
                </div>

                {/* Draft Content Preview */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">DRAFT CONTENT</h4>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-slate-200 font-mono text-sm">
                      {selectedDraft.content}
                    </pre>
                  </div>
                </div>

                {/* Review Notes */}
                {reviewAction && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Review Notes (optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      rows={3}
                      disabled={uploading}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!reviewAction ? (
                    <>
                      <motion.button
                        onClick={() => handleReviewDraft(selectedDraft, 'approve')}
                        disabled={uploading}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50"
                        whileHover={!uploading ? { scale: 1.02 } : {}}
                        whileTap={!uploading ? { scale: 0.98 } : {}}
                      >
                        <ThumbsUp size={20} />
                        Approve Draft
                      </motion.button>
                      <motion.button
                        onClick={() => handleReviewDraft(selectedDraft, 'reject')}
                        disabled={uploading}
                        className="bg-red-600 hover:bg-red-500 text-white flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 transition-colors"
                        whileHover={!uploading ? { scale: 1.02 } : {}}
                        whileTap={!uploading ? { scale: 0.98 } : {}}
                      >
                        <ThumbsDown size={20} />
                        Reject Draft
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setShowDraftModal(false);
                          setSelectedDraft(null);
                        }}
                        disabled={uploading}
                        className="btn-outline px-6 py-3 rounded-xl disabled:opacity-50"
                        whileHover={!uploading ? { scale: 1.02 } : {}}
                        whileTap={!uploading ? { scale: 0.98 } : {}}
                      >
                        Close
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        onClick={submitReview}
                        disabled={uploading}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                          reviewAction === 'approve'
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                        whileHover={!uploading ? { scale: 1.02 } : {}}
                        whileTap={!uploading ? { scale: 0.98 } : {}}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="animate-spin" size={20} />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}
                          </>
                        )}
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setReviewAction(null);
                          setReviewNotes('');
                        }}
                        disabled={uploading}
                        className="btn-outline px-6 py-3 rounded-xl disabled:opacity-50"
                        whileHover={!uploading ? { scale: 1.02 } : {}}
                        whileTap={!uploading ? { scale: 0.98 } : {}}
                      >
                        <X size={20} />
                        Cancel
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Metadata Footer */}
                <div className="mt-6 pt-6 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                  {selectedDraft.confidence_score && (
                    <p>Confidence Score: {(selectedDraft.confidence_score * 100).toFixed(0)}%</p>
                  )}
                  <p>Created: {new Date(selectedDraft.created_at).toLocaleString()}</p>
                  {selectedDraft.category && <p>Category: {selectedDraft.category}</p>}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Draft Modal */}
      <AnimatePresence>
        {showEditModal && selectedDraft && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !uploading && setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-800 rounded-2xl p-8 max-w-4xl w-full shadow-strong max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Edit className="text-white" size={24} />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-50">Edit Draft</h3>
                </div>

                {/* Edit Form */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Document title..."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Category (optional)
                    </label>
                    <input
                      type="text"
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value)}
                      placeholder="e.g., general, support, etc."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Content
                    </label>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Draft content..."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
                      rows={15}
                      disabled={uploading}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={submitEdit}
                    disabled={uploading || !editedTitle.trim() || !editedContent.trim()}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!uploading && editedTitle.trim() && editedContent.trim() ? { scale: 1.02 } : {}}
                    whileTap={!uploading && editedTitle.trim() && editedContent.trim() ? { scale: 0.98 } : {}}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedDraft(null);
                      setEditedTitle('');
                      setEditedContent('');
                      setEditedCategory('');
                    }}
                    disabled={uploading}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50"
                    whileHover={!uploading ? { scale: 1.02 } : {}}
                    whileTap={!uploading ? { scale: 0.98 } : {}}
                  >
                    <X size={20} />
                    Cancel
                  </motion.button>
                </div>

                {/* Metadata Footer */}
                <div className="mt-6 pt-6 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                  <p>Original Draft ID: {selectedDraft.id}</p>
                  <p>Created: {new Date(selectedDraft.created_at).toLocaleString()}</p>
                  {selectedDraft.query_pattern && <p>Pattern: {selectedDraft.query_pattern}</p>}
                  {selectedDraft.feedback_count && <p>Based on {selectedDraft.feedback_count} feedback items</p>}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Document Modal (Read-only) */}
      <AnimatePresence>
        {showViewModal && selectedDocument && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !uploading && setShowViewModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-800 rounded-2xl p-8 max-w-4xl w-full shadow-strong max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedDocument.source_type === 'draft_published'
                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                      : 'bg-gradient-to-br from-primary-500 to-secondary-500'
                  }`}>
                    {selectedDocument.source_type === 'draft_published' ? (
                      <Sparkles className="text-white" size={24} />
                    ) : (
                      <Eye className="text-white" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-slate-50">{selectedDocument.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedDocument.source_type === 'draft_published' && '✨ Auto-Published Draft • '}
                      {selectedDocument.file_type?.toUpperCase()} • {selectedDocument.chunk_count} chunks
                      {selectedDocument.category && ` • ${selectedDocument.category}`}
                    </p>
                  </div>
                </div>

                {/* Document Content Preview */}
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">DOCUMENT CONTENT</h4>
                  {viewContent === 'Loading full content...' ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="animate-spin mx-auto mb-2 text-primary-400" size={32} />
                        <p className="text-sm text-slate-400">Loading full document content...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-slate-200 font-mono text-sm leading-relaxed">
                        {viewContent}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => handleDownload(selectedDocument)}
                    disabled={uploading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50"
                    whileHover={!uploading ? { scale: 1.02 } : {}}
                    whileTap={!uploading ? { scale: 0.98 } : {}}
                  >
                    <Download size={20} />
                    Download Document
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEditDocument(selectedDocument);
                    }}
                    disabled={uploading}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 transition-colors"
                    whileHover={!uploading ? { scale: 1.02 } : {}}
                    whileTap={!uploading ? { scale: 0.98 } : {}}
                  >
                    <Edit size={20} />
                    Edit Document
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedDocument(null);
                      setViewContent('');
                    }}
                    disabled={uploading}
                    className="btn-outline px-6 py-3 rounded-xl disabled:opacity-50"
                    whileHover={!uploading ? { scale: 1.02 } : {}}
                    whileTap={!uploading ? { scale: 0.98 } : {}}
                  >
                    Close
                  </motion.button>
                </div>

                {/* Metadata Footer */}
                <div className="mt-6 pt-6 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                  <p>Document ID: {selectedDocument.id}</p>
                  <p>Source Type: {selectedDocument.source_type}</p>
                  <p>File Type: {selectedDocument.file_type?.toUpperCase()}</p>
                  {selectedDocument.file_size && <p>File Size: {formatFileSize(selectedDocument.file_size)}</p>}
                  <p>Chunks: {selectedDocument.chunk_count}</p>
                  <p>Created: {new Date(selectedDocument.created_at).toLocaleString()}</p>
                  {selectedDocument.source_url && (
                    <p>
                      Source URL: <a href={selectedDocument.source_url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">{selectedDocument.source_url}</a>
                    </p>
                  )}
                  {selectedDocument.metadata?.draft_id && (
                    <p>Source Draft ID: {selectedDocument.metadata.draft_id}</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Document Edit Modal */}
      <AnimatePresence>
        {showDocEditModal && selectedDocument && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => !uploading && setShowDocEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-800 rounded-2xl p-8 max-w-4xl w-full shadow-strong max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <Edit className="text-white" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold text-slate-50">Edit Document</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedDocument.source_type === 'draft_published' && '✨ Auto-Published Draft • '}
                      Embeddings will be regenerated
                    </p>
                  </div>
                </div>

                {/* Warning for draft-published documents */}
                {selectedDocument.source_type === 'draft_published' && (
                  <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                      <div className="text-sm text-yellow-200">
                        <p className="font-semibold mb-1">Auto-Published Draft</p>
                        <p className="text-yellow-300">
                          This document was generated from a draft. Editing will update the knowledge base but won't modify the original draft.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Document title..."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Category (optional)
                    </label>
                    <input
                      type="text"
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value)}
                      placeholder="e.g., general, support, etc."
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={uploading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-2">
                      Content <span className="text-slate-400 text-xs">(Will replace existing content)</span>
                    </label>
                    {editedContent === 'Loading full content...' ? (
                      <div className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="animate-spin mx-auto mb-2 text-primary-400" size={32} />
                          <p className="text-sm text-slate-400">Loading full document content...</p>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        placeholder="Enter document content..."
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none font-mono text-sm"
                        rows={15}
                        disabled={uploading}
                      />
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      💡 Tip: Content will be automatically chunked and embeddings regenerated for optimal RAG retrieval
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    onClick={submitDocumentEdit}
                    disabled={uploading || !editedTitle.trim() || !editedContent.trim() || editedContent === 'Loading full content...'}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!uploading && editedTitle.trim() && editedContent.trim() && editedContent !== 'Loading full content...' ? { scale: 1.02 } : {}}
                    whileTap={!uploading && editedTitle.trim() && editedContent.trim() && editedContent !== 'Loading full content...' ? { scale: 0.98 } : {}}
                  >
                    {editedContent === 'Loading full content...' ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Loading Content...
                      </>
                    ) : uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Updating & Regenerating Embeddings...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Save & Regenerate Embeddings
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setShowDocEditModal(false);
                      setSelectedDocument(null);
                      setEditedTitle('');
                      setEditedContent('');
                      setEditedCategory('');
                    }}
                    disabled={uploading}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-50"
                    whileHover={!uploading ? { scale: 1.02 } : {}}
                    whileTap={!uploading ? { scale: 0.98 } : {}}
                  >
                    <X size={20} />
                    Cancel
                  </motion.button>
                </div>

                {/* Metadata Footer */}
                <div className="mt-6 pt-6 border-t border-slate-700 text-xs text-slate-400 space-y-1">
                  <p>Document ID: {selectedDocument.id}</p>
                  <p>Source Type: {selectedDocument.source_type}</p>
                  <p>Current Chunks: {selectedDocument.chunk_count}</p>
                  <p>Created: {new Date(selectedDocument.created_at).toLocaleString()}</p>
                  {selectedDocument.metadata?.draft_id && (
                    <p>Source Draft ID: {selectedDocument.metadata.draft_id}</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
