import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Badge, GlowBox } from '../components/ui';
import { HelpCircle, MessageCircle, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { apiService } from '../services/api';
import type { FAQ, FAQCategory } from '../types';

export const FAQs: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [faqsData, categoriesData] = await Promise.all([
          apiService.getPublicFAQs(selectedCategory || undefined),
          apiService.getFAQCategories(),
        ]);
        setFaqs(faqsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const handleFeedback = async (faqId: string, helpful: boolean) => {
    if (feedbackGiven.has(faqId)) return;

    try {
      await apiService.submitFAQFeedback(faqId, helpful);
      setFeedbackGiven((prev) => new Set(prev).add(faqId));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavigationNew />

      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="accent" size="lg" rounded className="mb-6">
                <MessageCircle className="w-4 h-4" />
                <span className="ml-2">Got Questions?</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl font-display font-bold mb-6 text-theme-primary"
            >
              Frequently Asked{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Questions
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-theme-secondary"
            >
              Find answers to common questions about Githaforge and our AI chatbot platform.
            </motion.p>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-2 mb-8 max-w-3xl mx-auto"
            >
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === ''
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat.slug
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800/50 text-gray-300 hover:bg-slate-700/50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </motion.div>
          )}

          {/* FAQ Items */}
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : faqs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No FAQs found</p>
              </div>
            ) : (
              <div className="space-y-4 px-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <GlowBox
                      glowColor="#a855f7"
                      glowIntensity="medium"
                      glowEffect="rotating"
                      borderGlow
                      sx={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 3,
                        p: 3,
                        border: '2px solid #a855f7',
                        boxShadow: '0 0 15px rgba(168, 85, 247, 0.5), inset 0 0 8px rgba(168, 85, 247, 0.2)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          background: 'rgba(0, 0, 0, 0.5)',
                          boxShadow: '0 0 30px rgba(168, 85, 247, 0.7), inset 0 0 15px rgba(168, 85, 247, 0.3)',
                        }
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <HelpCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-theme-primary mb-2">
                            {faq.question}
                          </h3>
                          <p className="text-theme-secondary whitespace-pre-wrap">
                            {faq.answer}
                          </p>

                          {/* Feedback Section */}
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/50">
                            <span className="text-sm text-gray-400">Was this helpful?</span>
                            {feedbackGiven.has(faq.id) ? (
                              <span className="text-sm text-green-400">Thanks for your feedback!</span>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFeedback(faq.id, true)}
                                  className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors"
                                  title="Yes, helpful"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(faq.id, false)}
                                  className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Not helpful"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlowBox>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
