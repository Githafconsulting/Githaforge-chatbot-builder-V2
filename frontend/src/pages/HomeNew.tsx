import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Button, Card, GlowButton, GlowBox } from '../components/ui';
import {
  Zap, MessageSquare, Shield, Check, ArrowRight, Brain, Rocket,
  Palette, BarChart3, Globe, Code, Database, Users, Clock, Sparkles, CheckCircle,
  ChevronLeft, ChevronRight, Star, Quote
} from 'lucide-react';
import { TrustedCompanies } from '../components/TrustedCompanies';

// All features from Features page
const allFeatures = [
  {
    icon: Zap,
    title: 'Lightning Fast Setup',
    description: 'Create and deploy your AI chatbot in under 5 minutes without any technical expertise.',
    gradient: 'from-yellow-500 to-orange-500',
    benefits: [
      'No coding required',
      'Drag-and-drop interface',
      'Pre-built templates',
      'One-click deployment'
    ]
  },
  {
    icon: Brain,
    title: 'RAG Technology',
    description: 'Advanced retrieval-augmented generation ensures accurate, context-aware responses every time.',
    gradient: 'from-blue-500 to-cyan-500',
    benefits: [
      'Semantic search',
      'Context understanding',
      'Source citations',
      'Continuous learning'
    ]
  },
  {
    icon: Palette,
    title: 'Full Customization',
    description: 'Make it yours with complete control over colors, branding, and messaging.',
    gradient: 'from-purple-500 to-pink-500',
    benefits: [
      'Custom brand colors',
      'Logo upload',
      'White-label option',
      'Custom welcome messages'
    ]
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track performance, user satisfaction, and conversation insights in real-time.',
    gradient: 'from-green-500 to-emerald-500',
    benefits: [
      'Real-time metrics',
      'Conversation history',
      'Satisfaction scores',
      'Trending queries'
    ]
  },
  {
    icon: Globe,
    title: 'Multi-Language Support',
    description: 'Communicate with customers in 5+ languages with automatic translation.',
    gradient: 'from-indigo-500 to-blue-500',
    benefits: [
      '5+ languages supported',
      'Auto-translation',
      'RTL text support',
      'Language detection'
    ]
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-level encryption and GDPR compliance keep your data safe.',
    gradient: 'from-red-500 to-rose-500',
    benefits: [
      'End-to-end encryption',
      'GDPR compliant',
      'SOC 2 certified',
      'Role-based access'
    ]
  },
  {
    icon: Code,
    title: 'Easy Integration',
    description: 'Embed your chatbot anywhere with a single line of code. Works on any website or platform.',
    gradient: 'from-slate-600 to-gray-700',
    benefits: [
      'One-line embed code',
      'React, Vue, Angular support',
      'REST API access',
      'Webhook integrations'
    ]
  },
  {
    icon: Database,
    title: 'Smart Knowledge Base',
    description: 'Upload PDFs, Word docs, text files, or scrape URLs. AI automatically learns from your content.',
    gradient: 'from-teal-500 to-cyan-600',
    benefits: [
      'Multiple file formats',
      'URL scraping',
      'Auto-vectorization',
      'Semantic search'
    ]
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite unlimited team members with granular permissions. Owner, Admin, and Member roles.',
    gradient: 'from-violet-500 to-purple-600',
    benefits: [
      'Unlimited team members',
      'Role-based permissions',
      'Activity tracking',
      'Shared workspace'
    ]
  },
  {
    icon: MessageSquare,
    title: 'Conversation Memory',
    description: 'Chatbots remember context across sessions. Users can pick up conversations where they left off.',
    gradient: 'from-pink-500 to-rose-600',
    benefits: [
      'Session persistence',
      'Context awareness',
      'User preferences',
      'Conversation history'
    ]
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Never miss a customer query. Your chatbot works around the clock, providing instant responses.',
    gradient: 'from-amber-500 to-orange-600',
    benefits: [
      'Always online',
      'Instant responses',
      'No maintenance downtime',
      'Global timezone support'
    ]
  },
  {
    icon: Sparkles,
    title: 'Auto-Improvement',
    description: 'Machine learning algorithms continuously improve response quality based on user feedback.',
    gradient: 'from-sky-500 to-blue-600',
    benefits: [
      'Feedback learning',
      'Quality optimization',
      'Pattern recognition',
      'Automatic updates'
    ]
  }
];

export const HomeNew: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  // Auto-advance features carousel every 4 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allFeatures.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Auto-advance reviews carousel every 12 seconds (3x longer)
  useEffect(() => {
    if (isReviewPaused) return;

    const interval = setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % 6);
    }, 12000);

    return () => clearInterval(interval);
  }, [isReviewPaused]);

  // Calculate visible cards based on screen size
  const getVisibleCards = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 1; // mobile
    if (window.innerWidth < 1024) return 2; // tablet
    return 3; // desktop
  };

  const [visibleCards, setVisibleCards] = useState(getVisibleCards());

  useEffect(() => {
    const handleResize = () => setVisibleCards(getVisibleCards());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get color from gradient
  const getColorFromGradient = (gradient: string) => {
    const colorMap: Record<string, { hex: string; rgba: string }> = {
      'from-yellow-500': { hex: '#eab308', rgba: '234, 179, 8' },
      'from-blue-500': { hex: '#3b82f6', rgba: '59, 130, 246' },
      'from-purple-500': { hex: '#a855f7', rgba: '168, 85, 247' },
      'from-green-500': { hex: '#22c55e', rgba: '34, 197, 94' },
      'from-indigo-500': { hex: '#6366f1', rgba: '99, 102, 241' },
      'from-red-500': { hex: '#ef4444', rgba: '239, 68, 68' },
      'from-slate-600': { hex: '#475569', rgba: '71, 85, 105' },
      'from-teal-500': { hex: '#14b8a6', rgba: '20, 184, 166' },
      'from-violet-500': { hex: '#8b5cf6', rgba: '139, 92, 246' },
      'from-pink-500': { hex: '#ec4899', rgba: '236, 72, 153' },
      'from-amber-500': { hex: '#f59e0b', rgba: '245, 158, 11' },
      'from-sky-500': { hex: '#0ea5e9', rgba: '14, 165, 233' },
    };

    const colorKey = gradient.split(' ')[0];
    return colorMap[colorKey] || colorMap['from-blue-500'];
  };

  // Get cards to display
  const getVisibleFeatures = () => {
    const features = [];
    for (let i = 0; i < visibleCards; i++) {
      const index = (currentIndex + i) % allFeatures.length;
      features.push(allFeatures[index]);
    }
    return features;
  };

  // Navigation functions - desktop buttons only
  const goToNext = () => {
    setIsPaused(true);
    setCurrentIndex((prev) => (prev + 1) % allFeatures.length);
    setTimeout(() => setIsPaused(false), 5000);
  };

  const goToPrevious = () => {
    setIsPaused(true);
    setCurrentIndex((prev) => (prev - 1 + allFeatures.length) % allFeatures.length);
    setTimeout(() => setIsPaused(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavigationNew />

      {/* Hero Section */}
      <section id="home" className="relative pt-40 sm:pt-48 pb-12 overflow-hidden min-h-[70vh] flex items-center justify-center">
        {/* Desktop Background Image - AI/Technology themed from Unsplash */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/landing/hero-bg.jpg)',
          }}
        />

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/60 to-slate-950/70" />

        {/* Decorative Background Blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

        {/* Bottom fade gradient for smooth transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-10" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-4 text-theme-primary text-center"
            >
              Build Intelligent Chatbots{' '}
              <span style={{
                backgroundImage: 'linear-gradient(to right, #3b82f6, #06b6d4, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                in Minutes
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-theme-secondary mb-6 max-w-3xl mx-auto text-center"
            >
              Transform your customer support with AI chatbots powered by RAG technology.
              Upload your documents, customize your bot, and deploy in minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
            >
              <GlowButton
                glowColor="#a855f7"
                glowVariant="gradient"
                size="large"
                onClick={() => navigate('/signup')}
                startIcon={<Rocket />}
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 inline" />
              </GlowButton>
              <GlowButton
                glowColor="#a855f7"
                glowVariant="outline"
                size="large"
                onClick={() => {
                  const chatButton = document.querySelector('[data-chat-toggle]') as HTMLButtonElement;
                  chatButton?.click();
                }}
                startIcon={<MessageSquare />}
                sx={{ color: 'white !important' }}
              >
                Try Demo Chat
              </GlowButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center justify-center gap-6 text-sm text-theme-muted flex-wrap"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 bg-theme-primary overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 text-theme-primary">
              See It in Action
            </h2>
            <p className="text-lg sm:text-xl text-theme-secondary max-w-2xl mx-auto">
              Manage your chatbots from anywhere with our intuitive dashboard
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center relative"
          >
            {/* Background flare */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[700px] h-[480px] bg-gradient-to-r from-blue-500/20 via-purple-500/30 to-cyan-500/20 rounded-full blur-3xl" />
            </div>

            <img
              src="/images/landing/Githaforge landing page laptop and phone.png"
              alt="Githaforge dashboard on laptop and phone devices"
              className="max-w-full h-auto relative z-10"
              style={{ maxHeight: '600px' }}
            />
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section className="bg-theme-primary overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Image on the left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex justify-center"
            >
              <div className="relative">
                {/* Background flare */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[500px] h-[400px] bg-gradient-to-r from-purple-500/20 via-blue-500/30 to-cyan-500/20 rounded-full blur-3xl" />
                </div>
                <img
                  src="/images/landing/Feature section my chatbots.png"
                  alt="My Chatbots dashboard view"
                  className="max-w-full h-auto relative z-10"
                  style={{ maxHeight: '550px' }}
                />
              </div>
            </motion.div>

            {/* Text on the right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-theme-primary">
                Manage All Your Chatbots in One Place
              </h2>
              <p className="text-lg text-theme-secondary mb-6">
                Your central hub for creating, organizing, and monitoring all your AI chatbots. Get a bird's-eye view of every bot's performance and status at a glance.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Create unlimited chatbots for different use cases</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Monitor conversation counts and activity in real-time</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Quickly access settings, training, and embed codes</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

      </section>

      {/* Feature Showcase Section 2 - Image Right, Text Left */}
      <section className="bg-theme-primary overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16">
            {/* Image on the right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex justify-center"
            >
              <div className="relative">
                {/* Background flare */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[500px] h-[400px] bg-gradient-to-r from-cyan-500/20 via-blue-500/30 to-purple-500/20 rounded-full blur-3xl" />
                </div>
                <img
                  src="/images/landing/Feature section personas.png"
                  alt="Personas management dashboard"
                  className="max-w-full h-auto relative z-10"
                  style={{ maxHeight: '550px' }}
                />
              </div>
            </motion.div>

            {/* Text on the left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-theme-primary">
                Give Your Chatbots Unique Personalities
              </h2>
              <p className="text-lg text-theme-secondary mb-6">
                Create custom personas that define how your chatbots communicate. From professional and formal to friendly and casual, tailor the tone and style to match your brand.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Define custom system prompts for each persona</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Choose from pre-built templates or create your own</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Assign different personas to different chatbots</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section 3 - Image Left, Text Right */}
      <section className="bg-theme-primary overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Image on the left */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex justify-center"
            >
              <div className="relative">
                {/* Background flare */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[500px] h-[400px] bg-gradient-to-r from-purple-500/20 via-blue-500/30 to-cyan-500/20 rounded-full blur-3xl" />
                </div>
                <img
                  src="/images/landing/Feature section learning.png"
                  alt="Knowledge base training dashboard"
                  className="max-w-full h-auto relative z-10"
                  style={{ maxHeight: '550px' }}
                />
              </div>
            </motion.div>

            {/* Text on the right */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-1"
            >
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-theme-primary">
                Train Your Chatbot with Your Content
              </h2>
              <p className="text-lg text-theme-secondary mb-6">
                Upload documents or paste text to build a powerful knowledge base. Your chatbot learns from your content to provide accurate, context-aware responses.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Upload PDFs, Word docs, and text files</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">Automatic text extraction and processing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-theme-secondary">RAG-powered responses with source citations</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-20 bg-theme-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 text-theme-primary">
              Watch How It Works
            </h2>
            <p className="text-lg sm:text-xl text-theme-secondary max-w-2xl mx-auto">
              See how easy it is to create and deploy your AI chatbot in minutes
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            {/* Video Frame Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700/50">
              {/* Gradient border glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-2xl blur opacity-30" />

              {/* Video wrapper with aspect ratio */}
              <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {/* Placeholder - Replace src with actual video URL */}
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="Githaforge Demo Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Optional caption */}
            <p className="text-center text-theme-muted text-sm mt-4">
              3-minute walkthrough of the Githaforge platform
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Preview Section - Auto-Scrolling Carousel */}
      <section className="py-20 bg-theme-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4 text-theme-primary">
              Everything You Need to Scale
            </h2>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
              Powerful features to create, manage, and scale your AI chatbots
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative max-w-6xl mx-auto mb-12 px-8 py-12">
            {/* Desktop Navigation Buttons */}
            <button
              onClick={goToPrevious}
              className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all hover:scale-110 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-700"
              aria-label="Previous features"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={goToNext}
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all hover:scale-110 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-700"
              aria-label="Next features"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Auto-scrolling carousel container */}
            <div className="relative overflow-visible pt-6">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={currentIndex}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-4"
                >
                  {getVisibleFeatures().map((feature) => (
                    <div key={feature.title}>
                    <GlowBox
                        glowColor={getColorFromGradient(feature.gradient).hex}
                        sx={{
                          minHeight: '380px',
                          width: '100%',
                          background: 'rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 3,
                          p: 3,
                          display: 'flex',
                          flexDirection: 'column',
                          border: `2px solid ${getColorFromGradient(feature.gradient).hex}`,
                          boxShadow: `0 0 20px rgba(${getColorFromGradient(feature.gradient).rgba}, 0.5)`,
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-10px) scale(1.03)',
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(30px)',
                            boxShadow: `0 20px 40px rgba(${getColorFromGradient(feature.gradient).rgba}, 0.4)`,
                          },
                          '& h3': {
                            color: 'var(--text-primary) !important',
                          },
                          '& p, & li, & span': {
                            color: 'var(--text-secondary) !important',
                          },
                        }}
                      >
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                          <feature.icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-theme-primary">{feature.title}</h3>
                        <p className="text-theme-secondary mb-4 text-sm">{feature.description}</p>
                        <ul className="space-y-2">
                          {feature.benefits.map((benefit) => (
                            <li key={benefit} className="flex items-start gap-2 text-xs text-theme-secondary">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </GlowBox>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="text-center">
            <GlowButton
              glowColor="#a855f7"
              glowVariant="solid"
              size="large"
              onClick={() => navigate('/features')}
              endIcon={<ArrowRight />}
            >
              View All Features
            </GlowButton>
          </div>
        </div>
      </section>

      {/* Trusted Companies Section */}
      <TrustedCompanies />

      {/* Featured Reviews Section - Auto-Scrolling Carousel */}
      <section className="py-20 bg-theme-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-4 text-white">
              What Our Customers Say
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Join thousands of satisfied businesses using Githaforge
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative max-w-6xl mx-auto mb-12 px-8 py-12">
            {/* Desktop Navigation Buttons */}
            <button
              onClick={() => {
                setIsReviewPaused(true);
                setReviewIndex((prev) => (prev - 1 + 6) % 6);
                setTimeout(() => setIsReviewPaused(false), 15000);
              }}
              className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all hover:scale-110 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-700"
              aria-label="Previous reviews"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => {
                setIsReviewPaused(true);
                setReviewIndex((prev) => (prev + 1) % 6);
                setTimeout(() => setIsReviewPaused(false), 15000);
              }}
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg hover:shadow-xl transition-all hover:scale-110 text-slate-700 dark:text-white border-2 border-slate-200 dark:border-slate-700"
              aria-label="Next reviews"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Auto-scrolling carousel container */}
            <div className="relative overflow-hidden pt-4">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={`reviews-${reviewIndex}`}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    opacity: { duration: 0.2 }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-4"
                >
                  {[
                    {
                      name: 'Sarah Kim',
                      initials: 'SK',
                      role: 'CEO, TechStart Inc.',
                      review: 'Githaforge transformed our customer support. We reduced response times by 80% and our customers love the instant, accurate answers.',
                      gradient: 'from-blue-500 to-cyan-500',
                      glowColor: '#3b82f6',
                      quoteColor: 'text-blue-400/50'
                    },
                    {
                      name: 'Michael Johnson',
                      initials: 'MJ',
                      role: 'CTO, CloudNine Solutions',
                      review: 'The RAG technology is incredible. Our chatbot actually understands our products and gives detailed, accurate responses. Setup took less than an hour!',
                      gradient: 'from-purple-500 to-pink-500',
                      glowColor: '#a855f7',
                      quoteColor: 'text-purple-400/50'
                    },
                    {
                      name: 'Emily Parker',
                      initials: 'EP',
                      role: 'Head of Support, RetailPro',
                      review: "We've tried other chatbot platforms, but Githaforge is in a league of its own. The analytics dashboard helps us continuously improve our support.",
                      gradient: 'from-green-500 to-emerald-500',
                      glowColor: '#22c55e',
                      quoteColor: 'text-green-400/50'
                    },
                    {
                      name: 'David Chen',
                      initials: 'DC',
                      role: 'Founder, InnovateTech',
                      review: 'The multi-language support is a game changer for our global customer base. Our chatbot now handles queries in 5 different languages seamlessly.',
                      gradient: 'from-orange-500 to-red-500',
                      glowColor: '#f97316',
                      quoteColor: 'text-orange-400/50'
                    },
                    {
                      name: 'Lisa Martinez',
                      initials: 'LM',
                      role: 'VP Operations, ScaleUp',
                      review: 'Integration was a breeze. One line of code and our chatbot was live. The team collaboration features make managing everything so easy.',
                      gradient: 'from-cyan-500 to-blue-500',
                      glowColor: '#06b6d4',
                      quoteColor: 'text-cyan-400/50'
                    },
                    {
                      name: 'James Wilson',
                      initials: 'JW',
                      role: 'Director, GlobalServe',
                      review: 'The 24/7 availability has been crucial for our business. Customer satisfaction scores have increased by 45% since implementing Githaforge.',
                      gradient: 'from-pink-500 to-rose-500',
                      glowColor: '#ec4899',
                      quoteColor: 'text-pink-400/50'
                    }
                  ].slice(reviewIndex % 6, (reviewIndex % 6) + visibleCards).concat(
                    reviewIndex % 6 + visibleCards > 6
                      ? [
                          {
                            name: 'Sarah Kim',
                            initials: 'SK',
                            role: 'CEO, TechStart Inc.',
                            review: 'Githaforge transformed our customer support. We reduced response times by 80% and our customers love the instant, accurate answers.',
                            gradient: 'from-blue-500 to-cyan-500',
                            glowColor: '#3b82f6',
                            quoteColor: 'text-blue-400/50'
                          },
                          {
                            name: 'Michael Johnson',
                            initials: 'MJ',
                            role: 'CTO, CloudNine Solutions',
                            review: 'The RAG technology is incredible. Our chatbot actually understands our products and gives detailed, accurate responses. Setup took less than an hour!',
                            gradient: 'from-purple-500 to-pink-500',
                            glowColor: '#a855f7',
                            quoteColor: 'text-purple-400/50'
                          },
                          {
                            name: 'Emily Parker',
                            initials: 'EP',
                            role: 'Head of Support, RetailPro',
                            review: "We've tried other chatbot platforms, but Githaforge is in a league of its own. The analytics dashboard helps us continuously improve our support.",
                            gradient: 'from-green-500 to-emerald-500',
                            glowColor: '#22c55e',
                            quoteColor: 'text-green-400/50'
                          }
                        ].slice(0, (reviewIndex % 6) + visibleCards - 6)
                      : []
                  ).slice(0, visibleCards).map((review) => (
                    <div key={review.name}>
                      <div
                        className="h-[320px] w-full bg-slate-800/60 backdrop-blur-xl rounded-xl p-6 flex flex-col cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:bg-slate-800/80"
                        style={{ border: `2px solid ${review.glowColor}` }}
                      >
                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <Quote className={`w-8 h-8 ${review.quoteColor} mb-3 flex-shrink-0`} />
                        <div className="flex-grow overflow-hidden mb-6">
                          <p className="text-white/90 leading-relaxed line-clamp-4">
                            "{review.review}"
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-auto flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center text-white font-bold text-lg`}>
                            {review.initials}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{review.name}</p>
                            <p className="text-sm text-slate-400">{review.role}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="text-center">
            <GlowButton
              glowColor="#a855f7"
              glowVariant="solid"
              size="large"
              onClick={() => navigate('/reviews')}
              endIcon={<ArrowRight />}
            >
              View All Reviews
            </GlowButton>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 via-secondary-600 to-accent-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6 text-white">
              Ready to Transform Your Customer Support?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of businesses using Githaforge to automate support with AI
            </p>
            <GlowButton
              glowColor="#a855f7"
              glowVariant="solid"
              size="large"
              onClick={() => navigate('/signup')}
              startIcon={<Rocket />}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2 inline" />
            </GlowButton>
            <p className="text-sm text-blue-100 mt-4">No credit card required • 14-day free trial</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

