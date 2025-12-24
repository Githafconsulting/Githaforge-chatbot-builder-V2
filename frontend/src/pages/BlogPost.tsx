import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Badge, GlowBox, GlowButton } from '../components/ui';
import {
  Calendar,
  Clock,
  Eye,
  ChevronLeft,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Link as LinkIcon,
  ArrowRight,
  Tag,
  User,
} from 'lucide-react';
import { apiService } from '../services/api';
import type { Blog } from '../types';
import toast from 'react-hot-toast';

// Share button component
const ShareButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="p-2 rounded-lg bg-white/10 dark:bg-slate-800/50 hover:bg-purple-500/20 text-theme-secondary hover:text-purple-400 transition-all"
    title={label}
  >
    {icon}
  </button>
);

// Related post card
const RelatedPostCard: React.FC<{ blog: Blog }> = ({ blog }) => {
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
        className="p-4 rounded-xl bg-white/5 dark:bg-slate-800/30 border border-white/10 hover:border-purple-500/50 transition-all"
      >
        <div className="flex items-center gap-2 mb-2 text-sm text-theme-muted">
          <Calendar className="w-3 h-3" />
          {formattedDate}
        </div>
        <h4 className="font-semibold text-theme-primary line-clamp-2 mb-2">{blog.title}</h4>
        <span className="text-purple-400 text-sm flex items-center gap-1">
          Read More
          <ArrowRight className="w-3 h-3" />
        </span>
      </motion.div>
    </Link>
  );
};

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getBlogBySlug(slug);
        setBlog(data);

        // Fetch related posts
        if (data.id) {
          const related = await apiService.getRelatedBlogs(data.id, 3);
          setRelatedPosts(related);
        }
      } catch (err: any) {
        console.error('Error fetching blog:', err);
        setError(err.response?.status === 404 ? 'Blog post not found' : 'Error loading blog post');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  // Share handlers
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = blog?.title || '';

  const handleShareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const handleShareLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const handleShareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  // Format date
  const formattedDate = blog?.published_at
    ? new Date(blog.published_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <NavigationNew />
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="animate-pulse space-y-8">
              <div className="h-8 w-48 bg-white/10 dark:bg-slate-800/50 rounded" />
              <div className="h-12 bg-white/10 dark:bg-slate-800/50 rounded" />
              <div className="h-64 bg-white/10 dark:bg-slate-800/50 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-4 bg-white/10 dark:bg-slate-800/50 rounded w-full" />
                <div className="h-4 bg-white/10 dark:bg-slate-800/50 rounded w-5/6" />
                <div className="h-4 bg-white/10 dark:bg-slate-800/50 rounded w-4/6" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <NavigationNew />
        <div className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold text-theme-primary mb-4">
              {error || 'Blog post not found'}
            </h1>
            <p className="text-theme-secondary mb-8">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{blog.meta_title || blog.title} | Githaforge Blog</title>
        <meta name="description" content={blog.meta_description || blog.excerpt || ''} />
        {blog.meta_keywords && (
          <meta name="keywords" content={blog.meta_keywords.join(', ')} />
        )}
        <link rel="canonical" href={blog.canonical_url || `https://githaforge.com/blog/${blog.slug}`} />

        {/* Open Graph */}
        <meta property="og:title" content={blog.meta_title || blog.title} />
        <meta property="og:description" content={blog.meta_description || blog.excerpt || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://githaforge.com/blog/${blog.slug}`} />
        {blog.featured_image_url && (
          <meta property="og:image" content={blog.featured_image_url} />
        )}
        <meta property="article:published_time" content={blog.published_at || ''} />
        {blog.author_name && (
          <meta property="article:author" content={blog.author_name} />
        )}
        {blog.tags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog.meta_title || blog.title} />
        <meta name="twitter:description" content={blog.meta_description || blog.excerpt || ''} />
        {blog.featured_image_url && (
          <meta name="twitter:image" content={blog.featured_image_url} />
        )}

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: blog.title,
            description: blog.excerpt,
            image: blog.featured_image_url,
            datePublished: blog.published_at,
            dateModified: blog.updated_at,
            author: {
              '@type': 'Person',
              name: blog.author_name || 'Githaforge Team',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Githaforge',
              logo: {
                '@type': 'ImageObject',
                url: 'https://githaforge.com/logo.png',
              },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://githaforge.com/blog/${blog.slug}`,
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <NavigationNew />

        {/* Article Header */}
        <article className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {/* Back Link */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Link
                  to="/blogs"
                  className="inline-flex items-center gap-2 text-theme-secondary hover:text-purple-400 transition-colors mb-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Blog
                </Link>
              </motion.div>

              {/* Category & Meta */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-wrap items-center gap-4 mb-6"
              >
                {blog.category && (
                  <Link to={`/blogs?category=${blog.category.slug}`}>
                    <Badge
                      variant="accent"
                      size="md"
                      rounded
                      className="hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: `${blog.category.color}20`, color: blog.category.color }}
                    >
                      {blog.category.name}
                    </Badge>
                  </Link>
                )}
                <div className="flex items-center gap-4 text-sm text-theme-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {blog.read_time_minutes} min read
                  </span>
                  {blog.view_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {blog.view_count.toLocaleString()} views
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-display font-bold text-theme-primary mb-6"
              >
                {blog.title}
              </motion.h1>

              {/* Author */}
              {blog.author_name && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="flex items-center gap-3 mb-8"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                    {blog.author_avatar_url ? (
                      <img
                        src={blog.author_avatar_url}
                        alt={blog.author_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-theme-primary">{blog.author_name}</p>
                    <p className="text-sm text-theme-muted">Author</p>
                  </div>
                </motion.div>
              )}

              {/* Featured Image */}
              {blog.featured_image_url && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mb-12 rounded-2xl overflow-hidden"
                >
                  <img
                    src={blog.featured_image_url}
                    alt={blog.featured_image_alt || blog.title}
                    className="w-full h-auto max-h-[500px] object-cover"
                  />
                </motion.div>
              )}

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <GlowBox
                  glowColor="#a855f7"
                  glowIntensity="low"
                  borderGlow
                  sx={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                  }}
                >
                  <div className="p-8 sm:p-12">
                    <div className="prose prose-lg prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-3xl font-bold text-theme-primary mt-8 mb-4">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-2xl font-bold text-theme-primary mt-8 mb-4">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xl font-semibold text-theme-primary mt-6 mb-3">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-theme-secondary mb-4 leading-relaxed">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside text-theme-secondary mb-4 space-y-2">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside text-theme-secondary mb-4 space-y-2">{children}</ol>
                          ),
                          li: ({ children }) => <li className="text-theme-secondary">{children}</li>,
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="text-purple-400 hover:text-purple-300 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-purple-500 pl-4 italic text-theme-secondary my-4">
                              {children}
                            </blockquote>
                          ),
                          code: ({ children }) => (
                            <code className="bg-slate-800 text-purple-300 px-2 py-1 rounded text-sm">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto my-4">
                              {children}
                            </pre>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold text-theme-primary">{children}</strong>
                          ),
                        }}
                      >
                        {blog.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </GlowBox>
              </motion.div>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-8 flex flex-wrap items-center gap-2"
                >
                  <Tag className="w-4 h-4 text-theme-muted" />
                  {blog.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/blogs?tag=${tag}`}
                      className="px-3 py-1 rounded-full text-sm bg-white/10 dark:bg-slate-800/50 text-theme-secondary hover:bg-purple-500/20 hover:text-purple-400 transition-all"
                    >
                      #{tag}
                    </Link>
                  ))}
                </motion.div>
              )}

              {/* Share Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-12 pt-8 border-t border-white/10"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-theme-muted" />
                    <span className="text-theme-secondary font-medium">Share this article</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShareButton
                      icon={<Twitter className="w-5 h-5" />}
                      label="Share on Twitter"
                      onClick={handleShareTwitter}
                    />
                    <ShareButton
                      icon={<Linkedin className="w-5 h-5" />}
                      label="Share on LinkedIn"
                      onClick={handleShareLinkedIn}
                    />
                    <ShareButton
                      icon={<Facebook className="w-5 h-5" />}
                      label="Share on Facebook"
                      onClick={handleShareFacebook}
                    />
                    <ShareButton
                      icon={<LinkIcon className="w-5 h-5" />}
                      label="Copy Link"
                      onClick={handleCopyLink}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="mt-16"
                >
                  <h3 className="text-2xl font-bold text-theme-primary mb-6">Related Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {relatedPosts.map((post) => (
                      <RelatedPostCard key={post.id} blog={post} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="mt-16"
              >
                <GlowBox
                  glowColor="#a855f7"
                  glowIntensity="medium"
                  borderGlow
                  sx={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    border: '2px solid #a855f7',
                  }}
                >
                  <div className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-theme-primary mb-3">
                      Ready to Build Your AI Chatbot?
                    </h3>
                    <p className="text-theme-secondary mb-6">
                      Start creating intelligent chatbots in minutes. No coding required.
                    </p>
                    <GlowButton
                      glowColor="#a855f7"
                      glowVariant="gradient"
                      size="large"
                      onClick={() => navigate('/signup')}
                    >
                      Get Started Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </GlowButton>
                  </div>
                </GlowBox>
              </motion.div>
            </div>
          </div>
        </article>

        <Footer />
      </div>
    </>
  );
};
