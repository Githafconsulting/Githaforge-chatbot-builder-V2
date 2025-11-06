import React from 'react';
import { motion } from 'framer-motion';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Card, Badge, GlowButton, GlowBox } from '../components/ui';
import {
  Zap, Brain, Palette, BarChart3, Globe, Shield,
  Code, Database, Users, MessageSquare, Clock, Sparkles,
  CheckCircle, ArrowRight
} from 'lucide-react';

export const Features: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavigationNew />

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="primary" size="lg" rounded className="mb-6">
                <Sparkles className="w-4 h-4" />
                <span className="ml-2">Powerful Features</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl font-display font-bold mb-6 text-theme-primary"
            >
              Everything You Need to Build{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Amazing Chatbots
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-theme-secondary"
            >
              Powerful features designed to help you create, customize, and scale intelligent AI chatbots with ease.
            </motion.p>
          </div>

          {/* Main Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 px-4">
            {mainFeatures.map((feature, index) => {
              const glowColor = feature.gradient.includes('yellow') ? '#f59e0b' :
                               feature.gradient.includes('blue') ? '#3b82f6' :
                               feature.gradient.includes('purple') ? '#a855f7' :
                               feature.gradient.includes('green') ? '#10b981' :
                               feature.gradient.includes('indigo') ? '#6366f1' :
                               feature.gradient.includes('red') ? '#ef4444' : '#3b82f6';

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <GlowBox
                    glowColor={glowColor}
                    glowIntensity="high"
                    glowEffect="rotating"
                    borderGlow
                    sx={{
                      height: '100%',
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      p: 3,
                      border: `2px solid ${glowColor}`,
                      boxShadow: `0 0 20px ${glowColor}80, inset 0 0 10px ${glowColor}33`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(90deg, transparent, ${glowColor}33, transparent)`,
                        transition: 'left 0.6s ease-in-out',
                      },
                      '&:hover': {
                        transform: 'translateY(-10px) scale(1.03)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(30px)',
                        boxShadow: `0 0 40px ${glowColor}cc, 0 20px 60px -15px rgba(0, 0, 0, 0.5), inset 0 0 20px ${glowColor}4d`,
                        '&::before': {
                          left: '100%',
                        }
                      }
                    }}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-theme-primary">{feature.title}</h3>
                    <p className="text-theme-secondary mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 text-sm text-theme-secondary">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </GlowBox>
                </motion.div>
              );
            })}
          </div>

          {/* Advanced Features Section */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-display font-bold mb-4 text-theme-primary">
                Advanced Capabilities
              </h2>
              <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
                Enterprise-grade features for professional deployments
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
              {advancedFeatures.map((feature, index) => {
                const glowColor = feature.gradient.includes('slate') ? '#64748b' :
                                 feature.gradient.includes('teal') ? '#14b8a6' :
                                 feature.gradient.includes('violet') ? '#8b5cf6' :
                                 feature.gradient.includes('pink') ? '#ec4899' :
                                 feature.gradient.includes('amber') ? '#f59e0b' :
                                 feature.gradient.includes('sky') ? '#0ea5e9' : '#3b82f6';

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <GlowBox
                      glowColor={glowColor}
                      glowIntensity="high"
                      glowEffect="rotating"
                      borderGlow
                      sx={{
                        height: '100%',
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 3,
                        p: 4,
                        border: `2px solid ${glowColor}`,
                        boxShadow: `0 0 20px ${glowColor}80, inset 0 0 10px ${glowColor}33`,
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          background: 'rgba(0, 0, 0, 0.6)',
                          boxShadow: `0 0 40px ${glowColor}cc, 0 20px 60px -15px rgba(0, 0, 0, 0.5), inset 0 0 20px ${glowColor}4d`,
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2 text-theme-primary">{feature.title}</h3>
                          <p className="text-theme-secondary mb-4">{feature.description}</p>
                          <div className="flex items-center gap-2 text-primary-600 font-medium text-sm">
                            <span>Learn more</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </GlowBox>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center px-4"
          >
            <GlowBox
              glowColor="#a855f7"
              glowIntensity="high"
              glowEffect="rotating"
              borderGlow
              sx={{
                maxWidth: '48rem',
                margin: '0 auto',
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                p: 6,
                border: '2px solid #a855f7',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.3)',
              }}
            >
              <h2 className="text-3xl font-display font-bold mb-4 text-theme-primary">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-theme-secondary mb-8">
                Try all features free for 14 days. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <GlowButton
                  glowColor="#a855f7"
                  glowVariant="gradient"
                  size="large"
                  onClick={() => window.location.href = '/signup'}
                  endIcon={<ArrowRight />}
                >
                  Start Free Trial
                </GlowButton>
                <GlowButton
                  glowColor="#a855f7"
                  glowVariant="outline"
                  size="large"
                  onClick={() => window.location.href = '/pricing'}
                  sx={{ color: 'white !important' }}
                >
                  View Pricing
                </GlowButton>
              </div>
            </GlowBox>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const mainFeatures = [
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
  }
];

const advancedFeatures = [
  {
    icon: Code,
    title: 'Easy Integration',
    description: 'Embed your chatbot anywhere with a single line of code. Works on any website, platform, or framework. Supports React, Vue, Angular, and plain HTML.',
    gradient: 'from-slate-600 to-gray-700'
  },
  {
    icon: Database,
    title: 'Smart Knowledge Base',
    description: 'Upload PDFs, Word docs, text files, or scrape URLs. AI automatically learns from your content and creates searchable embeddings.',
    gradient: 'from-teal-500 to-cyan-600'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite unlimited team members with granular permissions. Owner, Admin, and Member roles keep your team organized.',
    gradient: 'from-violet-500 to-purple-600'
  },
  {
    icon: MessageSquare,
    title: 'Conversation Memory',
    description: 'Chatbots remember context across sessions. Users can pick up conversations where they left off for a seamless experience.',
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Never miss a customer query. Your chatbot works around the clock, providing instant responses even when you sleep.',
    gradient: 'from-amber-500 to-orange-600'
  },
  {
    icon: Sparkles,
    title: 'Auto-Improvement',
    description: 'Machine learning algorithms continuously improve response quality based on user feedback and interaction patterns.',
    gradient: 'from-sky-500 to-blue-600'
  }
];
