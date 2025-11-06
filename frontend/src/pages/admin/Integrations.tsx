import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Link as LinkIcon, CheckCircle, AlertCircle, AlertTriangle, Folder, File, Download, X, Loader2 } from 'lucide-react';
import { staggerContainer, staggerItem } from '../../utils/animations';
import { apiService } from '../../services/api';
import { connectGoogleDrive } from '../../utils/oauth';
import type { IntegrationConnection, IntegrationPlatform, CloudFile, ImportFilesRequest } from '../../types';
import toast from 'react-hot-toast';

interface PlatformCard {
  id: IntegrationPlatform;
  name: string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<IntegrationPlatform | null>(null);

  // File browser modal state
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatform | null>(null);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [importing, setImporting] = useState(false);

  // Platform configurations
  const platforms: PlatformCard[] = [
    {
      id: 'google_drive',
      name: 'Google Drive',
      description: 'Import documents from your Google Drive',
      icon: '/google-drive-logo.png',
      comingSoon: false, // ✅ NOW AVAILABLE
    },
    {
      id: 'microsoft',
      name: 'Microsoft 365',
      description: 'Connect to SharePoint, OneDrive, and Teams',
      icon: '/microsoft-365-logo.png',
      comingSoon: true,
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      description: 'Access files from your Dropbox account',
      icon: '/dropbox-logo.png',
      comingSoon: true,
    },
    {
      id: 'confluence',
      name: 'Confluence',
      description: 'Import pages from Atlassian Confluence',
      icon: '/confluence-logo.png',
      comingSoon: true,
    },
  ];

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, []);

  // Listen for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success || error) {
      // Clear OAuth localStorage flags
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('oauth_in_progress_')) {
          localStorage.removeItem(key);
        }
      });
    }

    if (success) {
      toast.success(`Successfully connected ${success === 'google_drive' ? 'Google Drive' : success}`);
      loadIntegrations(); // Reload integrations

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(`Connection failed: ${error}`);

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await apiService.getIntegrations();
      setIntegrations(data);
    } catch (error: any) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform: IntegrationPlatform) => {
    if (platform === 'google_drive') {
      try {
        setConnectingPlatform(platform);

        // Get authorization URL from backend
        const { authorization_url } = await apiService.connectGoogleDrive();

        // Open OAuth popup
        const result = await connectGoogleDrive(authorization_url);

        if (result.success) {
          toast.success('Successfully connected Google Drive!');
          loadIntegrations(); // Reload integrations
        } else {
          toast.error(result.error || 'Failed to connect Google Drive');
        }
      } catch (error: any) {
        console.error('Error connecting:', error);
        toast.error(error.response?.data?.detail || 'Failed to connect');
      } finally {
        setConnectingPlatform(null);
      }
    } else {
      toast.error('This integration is coming soon!');
    }
  };

  const handleDisconnect = async (platform: IntegrationPlatform) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) {
      return;
    }

    try {
      await apiService.disconnectIntegration(platform);
      toast.success('Disconnected successfully');
      loadIntegrations(); // Reload integrations
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error(error.response?.data?.detail || 'Failed to disconnect');
    }
  };

  const handleBrowseFiles = async (platform: IntegrationPlatform) => {
    setSelectedPlatform(platform);
    setShowFileBrowser(true);
    setSelectedFiles(new Set());
    setCurrentFolderId(undefined);
    await loadFiles(platform, undefined);
  };

  const loadFiles = async (platform: IntegrationPlatform, folderId?: string) => {
    try {
      setLoadingFiles(true);
      const data = await apiService.getCloudFiles(platform, folderId);
      setFiles(data.files);
      setCurrentFolderId(folderId);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast.error(error.response?.data?.detail || 'Failed to load files');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleFolderClick = (folderId: string) => {
    if (selectedPlatform) {
      loadFiles(selectedPlatform, folderId);
    }
  };

  const handleImport = async () => {
    if (!selectedPlatform || selectedFiles.size === 0) {
      return;
    }

    try {
      setImporting(true);

      const request: ImportFilesRequest = {
        fileIds: Array.from(selectedFiles),
        category: undefined
      };

      const result = await apiService.importFromCloud(selectedPlatform, request);

      // Show detailed success message
      const successCount = result.documents?.length || 0;
      const totalCount = selectedFiles.size;

      if (successCount === totalCount) {
        toast.success(`Successfully imported ${successCount} file${successCount !== 1 ? 's' : ''}!`, {
          duration: 4000,
        });
      } else if (successCount > 0) {
        toast.success(`Imported ${successCount} of ${totalCount} files. Some files were skipped.`, {
          duration: 5000,
        });
      }

      setShowFileBrowser(false);
      setSelectedFiles(new Set());
    } catch (error: any) {
      console.error('Error importing files:', error);

      // Parse error details if available
      const errorDetail = error.response?.data?.detail || 'Failed to import files';

      // Show more helpful error message
      if (errorDetail.includes('too large')) {
        toast.error('Some files exceed the 50MB size limit and were not imported.', {
          duration: 6000,
        });
      } else if (errorDetail.includes('Failed to import files:')) {
        // Backend returned detailed error - show it
        toast.error(errorDetail, {
          duration: 7000,
        });
      } else {
        toast.error(errorDetail, {
          duration: 5000,
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const getIntegrationStatus = (platformId: IntegrationPlatform): IntegrationConnection | undefined => {
    return integrations.find(i => i.platform === platformId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Cloud className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-50">Cloud Integrations</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                  Connect your cloud platforms to import documents into the knowledge base
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Google Drive Now Available Banner */}
        <motion.div
          variants={staggerItem}
          className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="text-green-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-50 mb-2">
                🎉 Google Drive Integration Now Available!
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                You can now connect your Google Drive account and import documents directly:
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Securely connect using OAuth 2.0 authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Browse and select files directly from your drive</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Automatically process documents into the knowledge base</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Support for PDF, DOCX, TXT, and Google Docs/Sheets/Slides</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Platform Cards Grid */}
        <motion.div
          variants={staggerItem}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {platforms.map((platform, index) => {
            const status = getIntegrationStatus(platform.id);
            const isConnected = status?.connected || false;
            const isConnecting = connectingPlatform === platform.id;

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card-hover rounded-2xl p-6 shadow-soft relative overflow-hidden"
              >
                {/* Coming Soon Badge */}
                {platform.comingSoon && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full border border-blue-500/30">
                    Coming Soon
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Platform Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl flex-shrink-0">
                    {platform.icon.startsWith('/') ? (
                      <img src={platform.icon} alt={platform.name} className="w-8 h-8 object-contain" />
                    ) : (
                      platform.icon
                    )}
                  </div>

                  {/* Platform Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-50 mb-1">
                      {platform.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      {platform.description}
                    </p>

                    {/* Connection Status */}
                    {isConnected ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle size={16} className="text-green-400" />
                          <span className="text-green-400 font-medium">Connected</span>
                        </div>
                        {status?.accountEmail && (
                          <p className="text-xs text-slate-400">
                            {status.accountEmail}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBrowseFiles(platform.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Browse Files
                          </button>
                          <button
                            onClick={() => handleDisconnect(platform.id)}
                            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.id)}
                        disabled={platform.comingSoon || isConnecting}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          platform.comingSoon || isConnecting
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-500 text-white'
                        }`}
                      >
                        {isConnecting && <Loader2 className="animate-spin" size={16} />}
                        {isConnecting ? 'Connecting...' : platform.comingSoon ? 'Coming Soon' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Help Section */}
        <motion.div
          variants={staggerItem}
          className="card-hover rounded-2xl p-6 shadow-soft"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
              <LinkIcon className="text-slate-400" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-50 mb-2">
                Secure Authentication
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                All cloud integrations use OAuth 2.0 for secure authentication. Your credentials
                are never stored - only encrypted access tokens that you can revoke at any time.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* File Browser Modal */}
      {showFileBrowser && selectedPlatform && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-50">
                  Browse {platforms.find(p => p.id === selectedPlatform)?.name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Select files to import into knowledge base
                </p>
              </div>
              <button
                onClick={() => setShowFileBrowser(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingFiles ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Folder size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No files found in this folder</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedFiles.has(file.id)
                          ? 'bg-blue-500/10 border-blue-500/50'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() => {
                        if (file.isFolder) {
                          handleFolderClick(file.id);
                        } else {
                          handleFileSelect(file.id);
                        }
                      }}
                    >
                      {file.isFolder ? (
                        <Folder className="text-blue-400 flex-shrink-0" size={24} />
                      ) : (
                        <File className="text-slate-400 flex-shrink-0" size={24} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        {file.size && (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-400">
                              {file.size > 1024 * 1024
                                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : `${(file.size / 1024).toFixed(2)} KB`}
                            </p>
                            {file.size > 50 * 1024 * 1024 && (
                              <div className="flex items-center gap-1 text-yellow-500">
                                <AlertTriangle size={14} />
                                <span className="text-xs">File too large (max 50MB)</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!file.isFolder && selectedFiles.has(file.id) && (
                        <CheckCircle className="text-blue-400 flex-shrink-0" size={20} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFileBrowser(false)}
                  className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedFiles.size === 0 || importing}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  {importing && <Loader2 className="animate-spin" size={16} />}
                  {importing ? 'Importing...' : `Import ${selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}`}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
