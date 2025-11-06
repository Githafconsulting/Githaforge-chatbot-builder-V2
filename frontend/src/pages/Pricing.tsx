import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Card, Badge, Button, GlowButton, GlowBox } from '../components/ui';
import { Check, Star, Zap, HelpCircle } from 'lucide-react';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const discount = billingCycle === 'yearly' ? 0.2 : 0; // 20% off yearly

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavigationNew />

      <section className="pt-32 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="accent" size="lg" rounded className="mb-6">
                <Zap className="w-4 h-4" />
                <span className="ml-2">Simple Pricing</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl font-display font-bold mb-6 text-theme-primary"
            >
              Choose the Perfect Plan for{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Business
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-theme-secondary mb-8"
            >
              Transparent pricing with no hidden fees. Start free, upgrade anytime.
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="inline-flex items-center gap-3 glass p-2 rounded-xl"
            >
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </motion.div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20 px-4 pt-16 pb-8">
            {pricingPlans.map((plan, index) => {
              const price = billingCycle === 'yearly'
                ? Math.round(plan.price * 12 * (1 - discount))
                : plan.price;
              const displayPrice = billingCycle === 'yearly' ? Math.round(price / 12) : price;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  style={{ transform: plan.featured ? 'scale(1.05)' : 'scale(1)' }}
                >
                  <GlowBox
                    glowColor="#a855f7"
                    glowIntensity={plan.featured ? 'high' : 'medium'}
                    glowEffect="rotating"
                    borderGlow
                    sx={{
                      height: '100%',
                      background: plan.featured ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      p: 0,
                      border: `2px solid #a855f7`,
                      boxShadow: plan.featured
                        ? '0 0 40px rgba(168, 85, 247, 0.8), inset 0 0 15px rgba(168, 85, 247, 0.4)'
                        : '0 0 20px rgba(168, 85, 247, 0.5), inset 0 0 10px rgba(168, 85, 247, 0.2)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        boxShadow: '0 0 50px rgba(168, 85, 247, 0.9), 0 20px 60px -15px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(168, 85, 247, 0.4)',
                      }
                    }}
                  >
                    {plan.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <Badge variant="primary" size="md" rounded>
                          <Star className="w-3 h-3" />
                          <span className="ml-1">Most Popular</span>
                        </Badge>
                      </div>
                    )}

                    <div className="p-8 pt-12">
                      <h3 className="text-2xl font-bold text-theme-primary mb-2">{plan.name}</h3>

                      <div className="mt-4 mb-2">
                        <span className="text-5xl font-bold text-theme-primary">${displayPrice}</span>
                        <span className="text-theme-muted">/{billingCycle === 'yearly' ? 'mo' : 'month'}</span>
                      </div>

                      {billingCycle === 'yearly' && plan.price > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                          Billed ${price}/year (save ${Math.round(plan.price * 12 * discount)})
                        </p>
                      )}

                      <p className="text-theme-secondary mb-6">{plan.description}</p>

                      <GlowButton
                        glowColor="#a855f7"
                        glowVariant={plan.featured ? 'gradient' : 'outline'}
                        fullWidth
                        size="large"
                        onClick={() => navigate(`/signup?plan=${plan.name.toLowerCase()}&billing=${billingCycle}`)}
                        sx={{ mb: 3 }}
                      >
                        {plan.cta}
                      </GlowButton>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-theme-primary uppercase tracking-wide">
                          {plan.name} includes:
                        </p>
                        <ul className="space-y-3">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-theme-secondary text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </GlowBox>
                </motion.div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-center mb-12 text-theme-primary">
              Frequently Asked Questions
            </h2>

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

const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out Githaforge',
    features: [
      '1 chatbot',
      '100 messages/month',
      '10 documents',
      'Basic analytics',
      'Email support',
      'Community access'
    ],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Pro',
    price: 29,
    description: 'For growing businesses',
    features: [
      '5 chatbots',
      '10,000 messages/month',
      'Unlimited documents',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'Team collaboration (up to 5)',
      'API access',
      'Export data'
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 99,
    description: 'For large organizations',
    features: [
      'Unlimited chatbots',
      'Unlimited messages',
      'Unlimited documents',
      'White-label solution',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee (99.9%)',
      'On-premise deployment option',
      'SSO (SAML, OAuth)',
      'Advanced security features',
      'Unlimited team members',
      'Custom training'
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

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
  }
];
