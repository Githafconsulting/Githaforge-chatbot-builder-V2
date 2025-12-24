import React from 'react';
import { motion } from 'framer-motion';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Badge, GlowBox } from '../components/ui';
import { HelpCircle, MessageCircle } from 'lucide-react';

export const FAQs: React.FC = () => {
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

          {/* FAQ Items */}
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4 px-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
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
                      <div>
                        <h3 className="text-lg font-semibold text-theme-primary mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-theme-secondary">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </GlowBox>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const faqs = [
  {
    question: 'Can I change plans later?',
    answer: 'Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we\'ll prorate any charges.'
  },
  {
    question: 'What happens after the 14-day trial?',
    answer: 'After your trial ends, you\'ll be automatically subscribed to the Free plan unless you choose a paid plan. Your data and chatbots are always safe.'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied, we\'ll refund you in full, no questions asked.'
  },
  {
    question: 'How does the message limit work?',
    answer: 'Message limits reset monthly. If you exceed your limit, your chatbot will still work but you\'ll be prompted to upgrade for continued service.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-level encryption, are GDPR and SOC 2 compliant, and never share your data with third parties. Your data belongs to you.'
  },
  {
    question: 'Can I get a custom Enterprise plan?',
    answer: 'Yes! Contact our sales team to discuss custom pricing, features, and SLAs tailored to your organization\'s needs.'
  },
  {
    question: 'What types of documents can I upload?',
    answer: 'You can upload PDF, DOCX, TXT, and HTML files. We also support scraping content directly from URLs to build your knowledge base.'
  },
  {
    question: 'How many chatbots can I create?',
    answer: 'The number of chatbots depends on your plan. Free users get 1 chatbot, Pro users get 5, and Enterprise users get unlimited chatbots.'
  },
  {
    question: 'Can I customize the chatbot appearance?',
    answer: 'Yes! You can customize colors, branding, welcome messages, and more to match your website\'s look and feel.'
  },
  {
    question: 'Do you offer API access?',
    answer: 'Yes, API access is available on Pro and Enterprise plans. You can integrate our chatbot functionality into your own applications.'
  }
];
