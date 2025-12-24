import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  HelpCircle,
  Check,
  X,
  Eye,
  EyeOff,
  Star,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Tag,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { apiService } from '../../services/api';
import type { FAQ, FAQCategory, FAQCreate, FAQUpdate } from '../../types';
import toast from 'react-hot-toast';

// Status badge component
const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
        isActive
          ? 'bg-green-500/20 text-green-400 border-green-500/50'
          : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      }`}
    >
      {isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
};

// FAQ editor modal
const FAQEditor: React.FC<{
  faq?: FAQ;
  categories: FAQCategory[];
  onSave: (data: FAQCreate | FAQUpdate) => Promise<void>;
  onClose: () => void;
}> = ({ faq, categories, onSave, onClose }) => {
  const [formData, setFormData] = useState<FAQCreate>({
    question: faq?.question || '',
    answer: faq?.answer || '',
    category_id: faq?.category_id || '',
    display_order: faq?.display_order || 0,
    is_featured: faq?.is_featured || false,
    is_active: faq?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  // Sync form data when faq prop changes
  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question || '',
        answer: faq.answer || '',
        category_id: faq.category_id || '',
        display_order: faq.display_order || 0,
        is_featured: faq.is_featured || false,
        is_active: faq.is_active ?? true,
      });
    }
  }, [faq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question || !formData.answer) {
      toast.error('Question and answer are required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving FAQ:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            {faq ? 'Edit FAQ' : 'Create New FAQ'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Question *
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter the FAQ question"
                required
              />
            </div>

            {/* Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Answer *
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={5}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter the answer"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value || undefined })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Order
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                min={0}
              />
              <p className="text-xs text-gray-400 mt-1">
                Lower numbers appear first
              </p>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Featured</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {faq ? 'Update FAQ' : 'Create FAQ'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Category editor modal
const CategoryEditor: React.FC<{
  category?: FAQCategory;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}> = ({ category, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    icon: category?.icon || 'help-circle',
    display_order: category?.display_order || 0,
    is_active: category?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        icon: category.icon || 'help-circle',
        display_order: category.display_order || 0,
        is_active: category.is_active ?? true,
      });
    }
  }, [category]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            {category ? 'Edit Category' : 'Create New Category'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              min={0}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-300">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {category ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Main component
export const FAQManagement: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean | undefined>(undefined);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | undefined>();
  const [showFAQEditor, setShowFAQEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FAQCategory | undefined>();
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [faqsResponse, categoriesData] = await Promise.all([
        apiService.getAdminFAQs({
          page_size: 100,
          category_id: selectedCategory || undefined,
          is_active: showActiveOnly,
          search: searchQuery || undefined,
        }),
        apiService.getAdminFAQCategories(),
      ]);
      setFaqs(faqsResponse.faqs);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      toast.error('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, showActiveOnly, searchQuery]);

  const handleCreateFAQ = async (data: FAQCreate) => {
    try {
      await apiService.createFAQ(data);
      toast.success('FAQ created successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create FAQ');
      throw error;
    }
  };

  const handleUpdateFAQ = async (data: FAQUpdate) => {
    if (!editingFAQ) return;
    try {
      await apiService.updateFAQ(editingFAQ.id, data);
      toast.success('FAQ updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update FAQ');
      throw error;
    }
  };

  const handleDeleteFAQ = async (faqId: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await apiService.deleteFAQ(faqId);
      toast.success('FAQ deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete FAQ');
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      await apiService.updateFAQ(faq.id, { is_active: !faq.is_active });
      toast.success(`FAQ ${faq.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update FAQ');
    }
  };

  const handleToggleFeatured = async (faq: FAQ) => {
    try {
      await apiService.updateFAQ(faq.id, { is_featured: !faq.is_featured });
      toast.success(`FAQ ${faq.is_featured ? 'unfeatured' : 'featured'}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update FAQ');
    }
  };

  const handleCreateCategory = async (data: any) => {
    try {
      await apiService.createFAQCategory(data);
      toast.success('Category created successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
      throw error;
    }
  };

  const handleUpdateCategory = async (data: any) => {
    if (!editingCategory) return;
    try {
      await apiService.updateFAQCategory(editingCategory.id, data);
      toast.success('Category updated successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update category');
      throw error;
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? FAQs in this category will become uncategorized.')) return;
    try {
      await apiService.deleteFAQCategory(categoryId);
      toast.success('Category deleted successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const toggleExpanded = (faqId: string) => {
    setExpandedFAQs((prev) => {
      const next = new Set(prev);
      if (next.has(faqId)) {
        next.delete(faqId);
      } else {
        next.add(faqId);
      }
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-purple-400" />
            FAQ Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage frequently asked questions displayed on the public FAQ page
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Tag className="w-4 h-4" />
            {showCategories ? 'Hide Categories' : 'Show Categories'}
          </button>
          <button
            onClick={() => {
              setEditingFAQ(undefined);
              setShowFAQEditor(true);
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add FAQ
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <AnimatePresence>
        {showCategories && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Categories</h2>
                <button
                  onClick={() => {
                    setEditingCategory(undefined);
                    setShowCategoryEditor(true);
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Category
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-white">{category.name}</div>
                      <div className="text-sm text-gray-400">{category.slug}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          category.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setShowCategoryEditor(true);
                        }}
                        className="p-1 hover:bg-slate-600 rounded"
                      >
                        <Pencil className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 hover:bg-slate-600 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={showActiveOnly === undefined ? '' : showActiveOnly.toString()}
          onChange={(e) =>
            setShowActiveOnly(e.target.value === '' ? undefined : e.target.value === 'true')
          }
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-2xl font-bold text-white">{faqs.length}</div>
          <div className="text-sm text-gray-400">Total FAQs</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-2xl font-bold text-green-400">
            {faqs.filter((f) => f.is_active).length}
          </div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {faqs.filter((f) => f.is_featured).length}
          </div>
          <div className="text-sm text-gray-400">Featured</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-2xl font-bold text-purple-400">{categories.length}</div>
          <div className="text-sm text-gray-400">Categories</div>
        </div>
      </div>

      {/* FAQ List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No FAQs found</p>
            <button
              onClick={() => {
                setEditingFAQ(undefined);
                setShowFAQEditor(true);
              }}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create your first FAQ
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleExpanded(faq.id)}
                    >
                      {expandedFAQs.has(faq.id) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <h3 className="font-medium text-white truncate">{faq.question}</h3>
                    </div>

                    <AnimatePresence>
                      {expandedFAQs.has(faq.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="text-gray-300 mt-2 pl-6 whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 mt-2 pl-6 text-sm">
                      {faq.category && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          {faq.category.name}
                        </span>
                      )}
                      <StatusBadge isActive={faq.is_active} />
                      {faq.is_featured && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                      <span className="text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {faq.view_count} views
                      </span>
                      <span className="text-green-400 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {faq.helpful_count}
                      </span>
                      <span className="text-red-400 flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" />
                        {faq.not_helpful_count}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleFeatured(faq)}
                      className={`p-2 rounded-lg transition-colors ${
                        faq.is_featured
                          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          : 'bg-slate-700 text-gray-400 hover:text-yellow-400'
                      }`}
                      title={faq.is_featured ? 'Remove from featured' : 'Add to featured'}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(faq)}
                      className={`p-2 rounded-lg transition-colors ${
                        faq.is_active
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-slate-700 text-gray-400 hover:text-green-400'
                      }`}
                      title={faq.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {faq.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingFAQ(faq);
                        setShowFAQEditor(true);
                      }}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteFAQ(faq.id)}
                      className="p-2 bg-slate-700 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showFAQEditor && (
          <FAQEditor
            faq={editingFAQ}
            categories={categories}
            onSave={editingFAQ ? handleUpdateFAQ : handleCreateFAQ}
            onClose={() => {
              setShowFAQEditor(false);
              setEditingFAQ(undefined);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCategoryEditor && (
          <CategoryEditor
            category={editingCategory}
            onSave={editingCategory ? handleUpdateCategory : handleCreateCategory}
            onClose={() => {
              setShowCategoryEditor(false);
              setEditingCategory(undefined);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FAQManagement;
