import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Filter,
  Calendar,
  Clock,
  FileText,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
  Archive,
  Tag,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { apiService } from '../../services/api';
import type { Blog, BlogCategory, BlogCreate, BlogUpdate, BlogStatus } from '../../types';
import toast from 'react-hot-toast';

// Status badge component
const StatusBadge: React.FC<{ status: BlogStatus }> = ({ status }) => {
  const styles = {
    draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    published: 'bg-green-500/20 text-green-400 border-green-500/50',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  };

  const icons = {
    draft: <FileText className="w-3 h-3" />,
    published: <Globe className="w-3 h-3" />,
    archived: <Archive className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Blog editor modal
const BlogEditor: React.FC<{
  blog?: Blog;
  categories: BlogCategory[];
  onSave: (data: BlogCreate | BlogUpdate) => Promise<void>;
  onClose: () => void;
}> = ({ blog, categories, onSave, onClose }) => {
  const [formData, setFormData] = useState<BlogCreate>({
    title: blog?.title || '',
    slug: blog?.slug || '',
    excerpt: blog?.excerpt || '',
    content: blog?.content || '',
    featured_image_url: blog?.featured_image_url || '',
    featured_image_alt: blog?.featured_image_alt || '',
    meta_title: blog?.meta_title || '',
    meta_description: blog?.meta_description || '',
    meta_keywords: blog?.meta_keywords || [],
    category_id: blog?.category_id || '',
    tags: blog?.tags || [],
    author_name: blog?.author_name || 'Githaforge Team',
    status: blog?.status || 'draft',
    is_featured: blog?.is_featured || false,
  });
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sync form data when blog prop changes (for editing existing blogs)
  useEffect(() => {
    if (blog) {
      setFormData({
        title: blog.title || '',
        slug: blog.slug || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        featured_image_url: blog.featured_image_url || '',
        featured_image_alt: blog.featured_image_alt || '',
        meta_title: blog.meta_title || '',
        meta_description: blog.meta_description || '',
        meta_keywords: blog.meta_keywords || [],
        category_id: blog.category_id || '',
        tags: blog.tags || [],
        author_name: blog.author_name || 'Githaforge Team',
        status: blog.status || 'draft',
        is_featured: blog.is_featured || false,
      });
    }
  }, [blog]);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim().toLowerCase()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.meta_keywords?.includes(keywordInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        meta_keywords: [...(prev.meta_keywords || []), keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      meta_keywords: prev.meta_keywords?.filter((k) => k !== keyword) || [],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      const result = await apiService.uploadBlogImage(file);
      setFormData((prev) => ({
        ...prev,
        featured_image_url: result.url,
        featured_image_alt: prev.featured_image_alt || file.name.replace(/\.[^/.]+$/, ''),
      }));
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving blog:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {blog ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                placeholder="Enter blog title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                placeholder="url-friendly-slug"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Category</label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value || undefined }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Excerpt</label>
            <textarea
              value={formData.excerpt || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Brief summary for previews..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Content * (Markdown supported)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              rows={12}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none font-mono text-sm resize-none"
              placeholder="# Your blog content here...

Write in Markdown format. Support for headings, lists, links, code blocks, etc."
              required
            />
          </div>

          {/* Featured Image */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-white">Featured Image</label>

            {/* Image Preview */}
            {formData.featured_image_url && (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img
                  src={formData.featured_image_url}
                  alt={formData.featured_image_alt || 'Preview'}
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, featured_image_url: '', featured_image_alt: '' }))}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-400">Upload an image</span>
                </div>
                <label className={`flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                  uploading
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-white/20 hover:border-purple-500/50 hover:bg-slate-800/50'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-2" />
                        <p className="text-sm text-gray-400">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-400">Click to upload</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP (max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {formData.featured_image_url ? 'Current Image URL' : 'Or enter URL directly'}
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.featured_image_url || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, featured_image_url: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl bg-slate-800 border text-white focus:border-purple-500 focus:outline-none ${
                        formData.featured_image_url
                          ? 'border-green-500/50 pr-10'
                          : 'border-white/10'
                      }`}
                      placeholder="https://example.com/image.jpg"
                    />
                    {formData.featured_image_url && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                    )}
                  </div>
                  {formData.featured_image_url && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Image URL is set
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Alt Text (for SEO)</label>
                  <input
                    type="text"
                    value={formData.featured_image_alt || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured_image_alt: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Descriptive alt text"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* SEO Section */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Meta Title <span className="text-gray-400">(max 70 chars)</span>
                </label>
                <input
                  type="text"
                  value={formData.meta_title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value.slice(0, 70) }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="SEO-optimized title..."
                  maxLength={70}
                />
                <span className="text-xs text-gray-400 mt-1">
                  {formData.meta_title?.length || 0}/70
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Meta Description <span className="text-gray-400">(max 160 chars)</span>
                </label>
                <textarea
                  value={formData.meta_description || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value.slice(0, 160) }))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Brief description for search engines..."
                  maxLength={160}
                />
                <span className="text-xs text-gray-400 mt-1">
                  {formData.meta_description?.length || 0}/160
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Meta Keywords</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.meta_keywords?.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Add keyword..."
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl hover:bg-blue-500/30 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Publishing Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as BlogStatus }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Author Name</label>
                <input
                  type="text"
                  value={formData.author_name || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, author_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Author name"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    className="w-5 h-5 rounded border-white/20 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Featured Post
                  </span>
                </label>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {blog ? 'Update Post' : 'Create Post'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const BlogManagement: React.FC = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BlogStatus | ''>('');
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch blogs
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const [blogsResponse, catsResponse] = await Promise.all([
        apiService.getAdminBlogs({
          page,
          page_size: 10,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        apiService.getBlogCategories(),
      ]);
      setBlogs(blogsResponse.blogs);
      setTotalPages(blogsResponse.total_pages);
      setCategories(catsResponse);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [page, statusFilter, searchQuery]);

  // Handle create/update blog
  const handleSaveBlog = async (data: BlogCreate | BlogUpdate) => {
    try {
      if (editingBlog) {
        await apiService.updateBlog(editingBlog.id, data);
        toast.success('Blog updated successfully');
      } else {
        await apiService.createBlog(data as BlogCreate);
        toast.success('Blog created successfully');
      }
      fetchBlogs();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save blog');
      throw error;
    }
  };

  // Handle publish/unpublish
  const handleTogglePublish = async (blog: Blog) => {
    try {
      const isPublishing = blog.status !== 'published';
      await apiService.publishBlog(blog.id, isPublishing);
      toast.success(isPublishing ? 'Blog published!' : 'Blog unpublished');
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to update blog status');
    }
  };

  // Handle delete
  const handleDelete = async (blog: Blog) => {
    if (!confirm(`Are you sure you want to delete "${blog.title}"?`)) return;

    try {
      await apiService.deleteBlog(blog.id);
      toast.success('Blog deleted successfully');
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to delete blog');
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not published';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog Management</h1>
          <p className="text-gray-400 mt-1">Create and manage blog posts for your website</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          New Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BlogStatus | '')}
            className="px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Blog List */}
      <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 mt-4">Loading blogs...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No blog posts yet</h3>
            <p className="text-gray-400 mb-6">Create your first blog post to get started</p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Post
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm font-medium text-gray-400 p-4">Title</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-4">Category</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-4">Status</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-4">Date</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-4">Views</th>
                  <th className="text-right text-sm font-medium text-gray-400 p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog) => (
                  <motion.tr
                    key={blog.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {blog.is_featured && (
                          <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-white line-clamp-1">{blog.title}</p>
                          <p className="text-sm text-gray-400 line-clamp-1">/blog/{blog.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {blog.category ? (
                        <span
                          className="px-2 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: `${blog.category.color}20`,
                            color: blog.category.color,
                          }}
                        >
                          {blog.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={blog.status} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {formatDate(blog.published_at || blog.created_at)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Eye className="w-4 h-4" />
                        {blog.view_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {blog.status === 'published' && (
                          <a
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                            title="View"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleTogglePublish(blog)}
                          className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${
                            blog.status === 'published'
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          <Globe className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingBlog(blog)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(blog)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Blog Editor Modal */}
      <AnimatePresence>
        {(isCreating || editingBlog) && (
          <BlogEditor
            blog={editingBlog || undefined}
            categories={categories}
            onSave={handleSaveBlog}
            onClose={() => {
              setIsCreating(false);
              setEditingBlog(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
