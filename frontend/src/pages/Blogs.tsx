import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Badge, GlowBox } from '../components/ui';
import {
  BookOpen,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  Tag,
  ArrowRight,
  Eye,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../services/api';
import type { Blog, BlogCategory } from '../types';

// Blog Card Component
const BlogCard: React.FC<{ blog: Blog; featured?: boolean }> = ({ blog, featured = false }) => {
  const formattedDate = blog.published_at
    ? new Date(blog.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Link to={`/blog/${blog.slug}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <GlowBox
          glowColor="#a855f7"
          glowIntensity="medium"
          glowEffect="rotating"
          borderGlow
          sx={{
            height: '100%',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            p: 0,
            border: '2px solid #a855f7',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.5), inset 0 0 8px rgba(168, 85, 247, 0.2)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.7), inset 0 0 15px rgba(168, 85, 247, 0.3)',
            }
          }}
        >
          {/* Featured Image */}
          {blog.featured_image_url && (
            <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
              <img
                src={blog.featured_image_url}
                alt={blog.featured_image_alt || blog.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
              {blog.is_featured && (
                <div className="absolute top-3 left-3">
                  <Badge variant="accent" size="sm" rounded>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* Category & Date */}
            <div className="flex items-center gap-3 mb-3">
              {blog.category && (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${blog.category.color}20`, color: blog.category.color }}
                >
                  {blog.category.name}
                </span>
              )}
              <span className="text-sm text-theme-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
            </div>

            {/* Title */}
            <h3 className={`font-bold text-theme-primary mb-3 line-clamp-2 ${featured ? 'text-2xl' : 'text-lg'}`}>
              {blog.title}
            </h3>

            {/* Excerpt */}
            {blog.excerpt && (
              <p className={`text-theme-secondary mb-4 line-clamp-${featured ? '3' : '2'}`}>
                {blog.excerpt}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-4 text-sm text-theme-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {blog.read_time_minutes} min read
                </span>
                {blog.view_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {blog.view_count.toLocaleString()}
                  </span>
                )}
              </div>
              <span className="text-purple-400 flex items-center gap-1 font-medium group-hover:gap-2 transition-all">
                Read More
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </GlowBox>
      </motion.div>
    </Link>
  );
};

export const Blogs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [featuredBlogs, setFeaturedBlogs] = useState<Blog[]>([]);
  const [recentBlogs, setRecentBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');

  // Fetch blog data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [featured, recent, cats, tags] = await Promise.all([
          apiService.getFeaturedBlogs(2),
          apiService.getRecentBlogs(9, true),
          apiService.getBlogCategories(),
          apiService.getBlogTags(),
        ]);
        setFeaturedBlogs(featured);
        setRecentBlogs(recent);
        setCategories(cats);
        setAllTags(tags);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  };

  // Handle category filter
  const handleCategoryClick = (slug: string) => {
    if (selectedCategory === slug) {
      setSelectedCategory('');
      setSearchParams({});
    } else {
      setSelectedCategory(slug);
      setSearchParams({ category: slug });
    }
  };

  // Handle tag filter
  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag('');
      setSearchParams({});
    } else {
      setSelectedTag(tag);
      setSearchParams({ tag });
    }
  };

  // Filter blogs based on search/category/tag
  const filteredBlogs = recentBlogs.filter((blog) => {
    if (searchQuery && !blog.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !blog.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory && blog.category?.slug !== selectedCategory) {
      return false;
    }
    if (selectedTag && !blog.tags?.includes(selectedTag)) {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>Blog | Githaforge - AI Chatbot Insights & Updates</title>
        <meta
          name="description"
          content="Explore the latest insights on AI chatbots, customer service automation, and product updates from Githaforge. Learn how to build better chatbot experiences."
        />
        <meta
          name="keywords"
          content="AI chatbot, customer service automation, chatbot development, RAG, machine learning, Githaforge blog"
        />
        <link rel="canonical" href="https://githaforge.com/blogs" />
        <meta property="og:title" content="Blog | Githaforge - AI Chatbot Insights & Updates" />
        <meta
          property="og:description"
          content="Explore the latest insights on AI chatbots, customer service automation, and product updates from Githaforge."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://githaforge.com/blogs" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog | Githaforge" />
        <meta
          name="twitter:description"
          content="Explore the latest insights on AI chatbots, customer service automation, and product updates."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <NavigationNew />

        {/* Hero Section */}
        <section className="pt-32 pb-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge variant="accent" size="lg" rounded className="mb-6">
                  <BookOpen className="w-4 h-4" />
                  <span className="ml-2">Our Blog</span>
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl font-display font-bold mb-6 text-theme-primary"
              >
                Ideas & Insights on{' '}
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AI Chatbots
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-theme-secondary mb-8"
              >
                Discover tips, tutorials, case studies, and the latest updates on building
                exceptional AI-powered customer experiences.
              </motion.p>

              {/* Search Bar */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                onSubmit={handleSearch}
                className="max-w-xl mx-auto"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 dark:bg-slate-800/50 border-2 border-purple-500/30 text-theme-primary placeholder-theme-muted focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </motion.form>
            </div>
          </div>
        </section>

        {/* Categories Filter */}
        <section className="pb-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-3"
            >
              <button
                onClick={() => handleCategoryClick('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !selectedCategory
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/40'
                    : 'bg-white/10 dark:bg-slate-800/50 text-theme-secondary hover:bg-white/20 dark:hover:bg-slate-700/50'
                }`}
              >
                All Posts
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.slug
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/40'
                      : 'bg-white/10 dark:bg-slate-800/50 text-theme-secondary hover:bg-white/20 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Featured Posts Section */}
        {!selectedCategory && !selectedTag && !searchQuery && featuredBlogs.length > 0 && (
          <section className="pb-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold text-theme-primary mb-8 flex items-center gap-2"
              >
                <Sparkles className="w-6 h-6 text-purple-400" />
                Featured Articles
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {featuredBlogs.map((blog, index) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <BlogCard blog={blog} featured />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Posts Grid */}
        <section className="pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {!selectedCategory && !selectedTag && !searchQuery && (
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold text-theme-primary mb-8"
              >
                Latest Articles
              </motion.h2>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-96 rounded-3xl bg-white/10 dark:bg-slate-800/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredBlogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredBlogs.map((blog, index) => (
                  <motion.div
                    key={blog.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <BlogCard blog={blog} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-theme-primary mb-2">No articles found</h3>
                <p className="text-theme-secondary">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : 'Check back soon for new content!'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Tags Cloud */}
        {allTags.length > 0 && (
          <section className="pb-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold text-theme-primary mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Popular Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTag === tag
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 dark:bg-slate-800/50 text-theme-secondary hover:bg-purple-500/20 hover:text-purple-400'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <GlowBox
              glowColor="#a855f7"
              glowIntensity="high"
              glowEffect="rotating"
              borderGlow
              sx={{
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(20px)',
                borderRadius: 4,
                p: 0,
                border: '2px solid #a855f7',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)',
              }}
            >
              <div className="p-12 text-center">
                <h2 className="text-3xl font-bold text-theme-primary mb-4">
                  Ready to Build Your AI Chatbot?
                </h2>
                <p className="text-lg text-theme-secondary mb-8 max-w-2xl mx-auto">
                  Start creating intelligent chatbots that delight your customers and automate your
                  support. No coding required.
                </p>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </GlowBox>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};
