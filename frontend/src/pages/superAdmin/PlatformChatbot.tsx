import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, Upload, FileText, Trash2, RefreshCw, MessageSquare,
  BarChart3, CheckCircle, AlertCircle, Download, Edit,
  Link as LinkIcon, X, List, Grid3x3
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface PlatformChatbot {
  id: string;
  name: string;
  description: string;
  greeting_message: string;
  is_active: boolean;
  deploy_status: string;
  total_conversations: number;
  total_messages: number;
  avg_satisfaction: number | null;
  created_at: string;
  updated_at: string;
}

interface PlatformDocument {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
  summary?: string;
  category?: string;
  download_url?: string;
}

interface PlatformStats {
  total_documents: number;
  total_chunks: number;
  total_conversations: number;
  total_messages: number;
  avg_satisfaction: number | null;
}

export const PlatformChatbot: React.FC = () => {
  const [chatbot, setChatbot] = useState<PlatformChatbot | null>(null);
  const [documents, setDocuments] = useState<PlatformDocument[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'settings'>('overview');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // URL form state
  const [url, setUrl] = useState('');

  // Edit form state
  const [editingDocument, setEditingDocument] = useState<PlatformDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const fetchPlatformData = async () => {
    try {
      setLoading(true);
      const response = await apiService.api.get('/api/v1/super-admin/platform-chatbot');
      setChatbot(response.data.chatbot);
      setDocuments(response.data.documents || []);
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Error fetching platform chatbot:', error);
      if (error.response?.status === 404) {
        toast.error('Platform chatbot not found. Please run the seed script.');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to load platform chatbot data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      await apiService.api.post('/api/v1/super-admin/platform-chatbot/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploaded successfully');
      fetchPlatformData();
      setShowUploadModal(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;

    try {
      setUploading(true);
      // Backend expects form data, not JSON
      const formData = new FormData();
      formData.append('url', url);
      await apiService.api.post('/api/v1/super-admin/platform-chatbot/documents/url', formData);
      toast.success('Document added from URL successfully');
      fetchPlatformData();
      setShowUrlModal(false);
      setUrl('');
    } catch (error: any) {
      console.error('Error adding document from URL:', error);
      toast.error(error.response?.data?.detail || 'Failed to add document from URL');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (doc: PlatformDocument) => {
    try {
      setEditingDocument(doc);
      setEditTitle(doc.title);
      setEditCategory(doc.category || '');
      setShowEditModal(true);
      setLoadingContent(true);

      // Fetch document content
      const response = await apiService.api.get(`/api/v1/super-admin/platform-chatbot/documents/${doc.id}/content`);
      setEditContent(response.data.content || '');
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

      await apiService.api.put(
        `/api/v1/super-admin/platform-chatbot/documents/${editingDocument.id}`,
        updateData
      );

      toast.success('Document updated successfully');
      fetchPlatformData();
      setShowEditModal(false);
      setEditingDocument(null);
    } catch (error: any) {
      console.error('Failed to update document:', error);
      toast.error(error.response?.data?.detail || 'Failed to update document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This will remove it from the knowledge base.')) {
      return;
    }

    try {
      await apiService.api.delete(`/api/v1/super-admin/platform-chatbot/documents/${documentId}`);
      toast.success('Document deleted successfully');
      fetchPlatformData();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete document');
    }
  };

  const handleDownload = async (doc: PlatformDocument) => {
    try {
      if (doc.download_url) {
        window.open(doc.download_url, '_blank');
      } else {
        const response = await apiService.api.get(
          `/api/v1/super-admin/platform-chatbot/documents/${doc.id}/download`,
          { responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', doc.title);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="bg-slate-800/50 border border-red-500/30 rounded-lg p-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Platform Chatbot Not Found</h3>
        <p className="text-slate-400 mb-6">
          The system chatbot has not been created yet. Please run the seed script to set it up.
        </p>
        <code className="bg-slate-900 text-red-400 px-4 py-2 rounded-lg text-sm">
          python -m scripts.seed_platform_chatbot
        </code>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Chatbot</h1>
          <p className="text-slate-400">Manage the Githaforge website demo chatbot</p>
        </div>
        <button
          onClick={fetchPlatformData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Chatbot Info Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">{chatbot.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                chatbot.deploy_status === 'deployed'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {chatbot.deploy_status}
              </span>
            </div>
            <p className="text-slate-400 mb-4">{chatbot.description}</p>
            <div className="text-sm text-slate-500">
              Created: {formatDate(chatbot.created_at)} | Last Updated: {formatDate(chatbot.updated_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Documents</p>
              <p className="text-2xl font-bold text-white">{stats?.total_documents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Chunks</p>
              <p className="text-2xl font-bold text-white">{stats?.total_chunks || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Messages</p>
              <p className="text-2xl font-bold text-white">{stats?.total_messages?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Satisfaction</p>
              <p className="text-2xl font-bold text-white">
                {stats?.avg_satisfaction ? `${(stats.avg_satisfaction * 100).toFixed(0)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {(['overview', 'documents', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Greeting Message</h3>
            <p className="text-slate-300 bg-slate-900/50 rounded-lg p-4 border border-slate-600">
              {chatbot.greeting_message}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Conversations</p>
                <p className="text-xl font-bold text-white">{chatbot.total_conversations?.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Messages</p>
                <p className="text-xl font-bold text-white">{chatbot.total_messages?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Document Actions Header */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Knowledge Base Documents</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Upload PDF, TXT, DOCX, or Markdown files to add to the website chatbot's knowledge base.
                </p>
              </div>
              <div className="flex gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-red-600 text-white'
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
                        ? 'bg-red-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid view"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setShowUrlModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Add from URL
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </button>
              </div>
            </div>
          </div>

          {/* Documents List/Grid */}
          {documents.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No documents uploaded yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Upload the Githaforge knowledge base to get started
              </p>
            </div>
          ) : viewMode === 'list' ? (
            // List View
            <div className="space-y-2">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-red-500/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{doc.title}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span>{doc.file_type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                      {doc.summary && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{doc.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(doc)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit document"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-red-500/50 transition-colors"
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
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {doc.summary && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{doc.summary}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{doc.chunk_count} chunks</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Chatbot Settings</h3>
          <p className="text-slate-400">
            Settings configuration coming soon. For now, you can modify settings directly in the database.
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowUploadModal(false)}
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
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-700 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">File</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.docx,.md"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
                />
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-300">
                  <strong>Platform Knowledge Base:</strong> This document will be added to the platform chatbot's knowledge base and used to answer questions on the Githaforge website.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={uploading || !selectedFile}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      )}

      {/* URL Modal */}
      {showUrlModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowUrlModal(false)}
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
              <button onClick={() => setShowUrlModal(false)} className="p-1 hover:bg-slate-700 rounded">
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-300">
                  <strong>Platform Knowledge Base:</strong> The content from this URL will be scraped and added to the platform chatbot's knowledge base.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowUrlModal(false)}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlSubmit}
                  disabled={uploading || !url}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      )}

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowEditModal(false)}
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
                onClick={() => setShowEditModal(false)}
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
                  className="w-8 h-8 border-4 border-slate-600 border-t-red-500 rounded-full"
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
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category (Optional)
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">No category</option>
                    <option value="general">General</option>
                    <option value="features">Features</option>
                    <option value="pricing">Pricing</option>
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
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={12}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                    placeholder="Enter document content..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {editContent.length} characters
                  </p>
                </div>

                {/* Info */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-xs text-red-300">
                    <strong>Re-processing:</strong> When you update the content, the document will be automatically re-chunked and re-embedded for improved search accuracy.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDocument}
                disabled={uploading || loadingContent || !editContent.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                    />
                    Updating...
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
      )}
    </div>
  );
};
