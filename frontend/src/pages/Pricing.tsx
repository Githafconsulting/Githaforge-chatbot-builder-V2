import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Card, Badge, Button, GlowButton, GlowBox } from '../components/ui';
import { Check, Star, Zap } from 'lucide-react';

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
              className="inline-flex items-center gap-1 bg-slate-800/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
            >
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-8 py-3 rounded-xl font-semibold text-base transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/40 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-8 py-3 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/40 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Yearly
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold">
                  -20%
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

