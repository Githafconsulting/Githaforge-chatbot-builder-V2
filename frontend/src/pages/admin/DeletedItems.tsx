import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Calendar,
  User,
  MessageSquare,
  MessageCircle,
  ThumbsDown,
  Search,
  Filter,
  Loader2,
  Clock,
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Square,
  CheckSquare,
  Trash,
  RotateCw
} from 'lucide-react';
import { apiService } from '../../services/api';
import type { DeletedItem } from '../../types';
import { staggerContainer, staggerItem } from '../../utils/animations';

// Note: 'message' type removed - messages are part of conversations
type ItemType = 'conversation' | 'feedback' | 'draft';

export const DeletedItemsPage: React.FC = () => {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ItemType[]>(['conversation', 'feedback', 'draft']);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadDeletedItems();
  }, [selectedTypes]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadDeletedItems = async () => {
    try {
      setLoading(true);
      // Fetch all items and filter client-side
      const response = await apiService.getDeletedItems();
      const allItems = response.items || [];

      // Filter by selected types
      const filtered = allItems.filter(item => selectedTypes.includes(item.item_type as ItemType));

      setItems(filtered);
      setTotalItems(filtered.length);
      setError('');
      setSelectedItems(new Set()); // Clear selection on reload
    } catch (err: any) {
      console.error('Error loading deleted items:', err);
      setError(err.response?.data?.detail || 'Failed to load deleted items');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (item: DeletedItem) => {
    if (!confirm(`Are you sure you want to recover this ${item.item_type}?`)) return;

    try {
      setProcessingId(item.id);

      switch (item.item_type) {
        case 'conversation':
          await apiService.recoverConversation(item.id);
          break;
        case 'feedback':
          await apiService.recoverFeedback(item.id);
          break;
        case 'draft':
          await apiService.recoverDraft(item.id);
          break;
      }

      await loadDeletedItems();
      alert(`${item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)} recovered successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to recover item');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm(`⚠️ PERMANENT DELETE ⚠️\n\nThis will PERMANENTLY delete this ${item.item_type} and cannot be undone.\n\nAre you absolutely sure?`)) return;

    try {
      setProcessingId(item.id);

      switch (item.item_type) {
        case 'conversation':
          await apiService.permanentDeleteConversation(item.id);
          break;
        case 'feedback':
          await apiService.permanentDeleteFeedback(item.id);
          break;
        case 'draft':
          await apiService.permanentDeleteDraft(item.id);
          break;
      }

      await loadDeletedItems();
      alert(`${item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)} permanently deleted.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to permanently delete item');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkRecover = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Recover ${selectedItems.size} selected items?`)) return;

    try {
      setBulkProcessing(true);
      const itemsToRecover = filteredItems.filter(item => selectedItems.has(item.id));

      for (const item of itemsToRecover) {
        switch (item.item_type) {
          case 'conversation':
            await apiService.recoverConversation(item.id);
            break;
          case 'feedback':
            await apiService.recoverFeedback(item.id);
            break;
          case 'draft':
            await apiService.recoverDraft(item.id);
            break;
        }
      }

      await loadDeletedItems();
      alert(`${selectedItems.size} items recovered successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to recover items');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`⚠️ PERMANENT DELETE ⚠️\n\nThis will PERMANENTLY delete ${selectedItems.size} items and cannot be undone.\n\nAre you absolutely sure?`)) return;

    try {
      setBulkProcessing(true);
      const itemsToDelete = filteredItems.filter(item => selectedItems.has(item.id));

      for (const item of itemsToDelete) {
        switch (item.item_type) {
          case 'conversation':
            await apiService.permanentDeleteConversation(item.id);
            break;
          case 'feedback':
            await apiService.permanentDeleteFeedback(item.id);
            break;
          case 'draft':
            await apiService.permanentDeleteDraft(item.id);
            break;
        }
      }

      await loadDeletedItems();
      alert(`${selectedItems.size} items permanently deleted.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete items');
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return <MessageSquare size={20} className="text-blue-400" />;
      case 'feedback':
        return <ThumbsDown size={20} className="text-yellow-400" />;
      case 'draft':
        return <FileText size={20} className="text-purple-400" />;
      default:
        return <Trash2 size={20} className="text-slate-400" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'conversation':
        return 'from-blue-500 to-blue-600';
      case 'feedback':
        return 'from-yellow-500 to-yellow-600';
      case 'draft':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const getDaysColor = (days: number) => {
    if (days <= 3) return 'text-red-400 bg-red-900/20';
    if (days <= 7) return 'text-orange-400 bg-orange-900/20';
    if (days <= 14) return 'text-yellow-400 bg-yellow-900/20';
    return 'text-green-400 bg-green-900/20';
  };

  const toggleType = (type: ItemType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        // Don't allow deselecting all types
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const allTypes: ItemType[] = ['conversation', 'feedback', 'draft'];

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.identifier.toLowerCase().includes(searchLower) ||
      item.content?.toLowerCase().includes(searchLower) ||
      item.deleted_by_email?.toLowerCase().includes(searchLower)
    );
  });

  return (
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Trash2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-50">Deleted Items</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Manage deleted items (30-day recovery window)
              </p>
            </div>
          </div>

          {/* Total Count Badge */}
          <div className="bg-slate-800 rounded-xl px-6 py-3 border border-slate-700">
            <p className="text-sm text-slate-400">Total Deleted</p>
            <p className="text-2xl font-bold text-slate-50">{totalItems}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex gap-4 items-center">
          {/* Type Filter - Multi-Select Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 hover:bg-slate-700 transition-colors flex items-center gap-2 min-w-[200px]"
            >
              <Filter size={16} />
              <span className="flex-1 text-left">
                {selectedTypes.length === allTypes.length
                  ? 'All Types'
                  : `${selectedTypes.length} Type${selectedTypes.length > 1 ? 's' : ''}`}
              </span>
              <ChevronDown size={16} className={`transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFilterDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {allTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedTypes.includes(type)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-slate-600'
                      }`}>
                        {selectedTypes.includes(type) && (
                          <CheckCircle size={14} className="text-white" />
                        )}
                      </div>
                      <span className="flex-1 capitalize text-slate-100">{type}</span>
                      {getItemIcon(type)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by ID, content, or deleted by..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-primary-600 rounded-xl p-4 flex items-center gap-4 shadow-lg"
          >
            <div className="flex items-center gap-2 text-white font-semibold">
              <CheckSquare size={20} />
              <span>{selectedItems.size} selected</span>
            </div>
            <div className="flex-1"></div>
            <button
              onClick={handleBulkRecover}
              disabled={bulkProcessing}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RotateCw size={16} />
              )}
              Recover All
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkProcessing ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Trash size={16} />
              )}
              Delete All
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Clear Selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-soft"
          >
            <AlertTriangle size={20} />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items List */}
      <motion.div
        variants={staggerItem}
        className="card-hover rounded-2xl shadow-soft overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="animate-spin w-12 h-12 text-primary-400 mx-auto mb-4" />
            <p className="text-slate-300">Loading deleted items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle size={40} className="text-green-600" />
            </motion.div>
            <p className="text-slate-300 text-lg">No deleted items</p>
            <p className="text-slate-400 text-sm mt-2">
              {searchTerm ? 'No items match your search' : 'All items are active'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {/* Select All Header */}
            <div className="p-4 bg-slate-800/50 flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {selectedItems.size === filteredItems.length ? (
                  <CheckSquare size={20} className="text-primary-400" />
                ) : (
                  <Square size={20} className="text-slate-400" />
                )}
              </button>
              <span className="text-sm text-slate-400 font-medium">
                Select All ({filteredItems.length} items)
              </span>
            </div>

            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-6 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelectItem(item.id)}
                      className="p-2 hover:bg-slate-600 rounded-lg transition-colors flex-shrink-0 mt-2"
                    >
                      {selectedItems.has(item.id) ? (
                        <CheckSquare size={20} className="text-primary-400" />
                      ) : (
                        <Square size={20} className="text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Item Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getItemColor(item.item_type)} flex items-center justify-center flex-shrink-0`}>
                          {getItemIcon(item.item_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-50">
                              {item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}
                            </h3>
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-medium">
                              ID: {item.id.substring(0, 8)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">
                            {item.item_type === 'conversation' && `Session: ${item.identifier}`}
                            {item.item_type === 'feedback' && `Message: ${item.identifier}`}
                            {item.item_type === 'draft' && `Title: ${item.identifier}`}
                          </p>
                        </div>
                      </div>

                      {/* Item Content */}
                      {item.content && (
                        <p className="text-sm text-slate-300 line-clamp-2 mb-3 ml-13 bg-slate-800 p-3 rounded-lg border border-slate-700">
                          {item.content}
                        </p>
                      )}

                      {/* Item Metadata */}
                      <div className="flex items-center gap-4 text-sm text-slate-400 ml-13 flex-wrap">
                        {item.deleted_by_email && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            Deleted by: {item.deleted_by_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Deleted: {new Date(item.deleted_at).toLocaleString()}
                        </span>
                        {item.related_count > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                            {item.related_count} related items
                          </span>
                        )}
                      </div>

                      {/* Days Until Permanent Delete */}
                      <div className="mt-3 ml-13">
                        <span className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg ${getDaysColor(item.days_until_permanent)}`}>
                          <Clock size={14} />
                          {item.days_until_permanent} days until permanent deletion
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <motion.button
                        onClick={() => handleRecover(item)}
                        disabled={processingId === item.id}
                        className="text-green-400 hover:text-green-300 p-3 rounded-lg hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Recover item"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {processingId === item.id ? (
                          <Loader2 className="animate-spin" size={20} />
                        ) : (
                          <RotateCcw size={20} />
                        )}
                      </motion.button>
                      <motion.button
                        onClick={() => handlePermanentDelete(item)}
                        disabled={processingId === item.id}
                        className="text-red-400 hover:text-red-300 p-3 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Permanently delete"
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
        )}
      </motion.div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 w-14 h-14 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Scroll to top"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <motion.div
        variants={staggerItem}
        className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 flex items-start gap-4"
      >
        <AlertTriangle className="text-blue-400 flex-shrink-0 mt-1" size={24} />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">About Soft Delete</h3>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            Deleted items are kept for <strong>30 days</strong> before automatic permanent deletion. During this period, you can:
          </p>
          <ul className="text-slate-300 text-sm space-y-2 ml-4">
            <li className="flex items-center gap-2">
              <RotateCcw size={16} className="text-green-400" />
              <span><strong>Recover:</strong> Restore the item and all related data</span>
            </li>
            <li className="flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" />
              <span><strong>Permanently Delete:</strong> Immediately and irreversibly remove the item</span>
            </li>
          </ul>
          <p className="text-slate-400 text-xs mt-3">
            ⚠️ Deleting a conversation also deletes all its messages and feedback. Recovery will restore everything.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
