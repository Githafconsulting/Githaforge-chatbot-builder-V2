import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Card, Badge, Button, GlowButton, GlowBox } from '../components/ui';
import { Check, Star, Zap, X, Mail, Users, User, Building2 } from 'lucide-react';

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

          {/* Pricing Cards - First row: Free, Starter, Pro, Enterprise */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-8 px-4 pt-16">
            {pricingPlans.filter(p => !p.isCustom).map((plan, index) => {
              const price = billingCycle === 'yearly' && plan.price > 0
                ? Math.round(plan.price * 12 * (1 - discount))
                : plan.price;
              const displayPrice = billingCycle === 'yearly' && plan.price > 0 ? Math.round(price / 12) : plan.price;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="h-full"
                >
                  <GlowBox
                    glowColor="#a855f7"
                    glowIntensity={plan.featured ? 'high' : 'medium'}
                    glowEffect="rotating"
                    borderGlow
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      background: plan.featured ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      p: 0,
                      border: '2px solid #a855f7',
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
                    <div className="p-6 flex flex-col h-full">
                      {/* Target audience row */}
                      <div className="flex items-center justify-center gap-2 mb-3 text-purple-400">
                        {plan.name === 'Free' && <User className="w-4 h-4" />}
                        {plan.name === 'Starter' && <User className="w-4 h-4" />}
                        {plan.name === 'Pro' && <Users className="w-4 h-4" />}
                        {plan.name === 'Enterprise' && <Building2 className="w-4 h-4" />}
                        <span className="text-sm font-medium">{plan.targetAudience}</span>
                      </div>

                      {/* Badge row - trial or most popular */}
                      <div className="flex justify-center mb-4 h-7">
                        {plan.featured ? (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="ml-1.5 text-sm font-semibold text-yellow-400">Most Popular</span>
                          </div>
                        ) : plan.hasTrial ? (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
                            <span className="text-sm font-medium text-green-400">7-day free trial</span>
                          </div>
                        ) : null}
                      </div>

                      <h3 className="text-2xl font-bold text-theme-primary mb-2 text-center">{plan.name}</h3>

                      <div className="mt-4 mb-2 text-center">
                        <span className="text-5xl font-bold text-theme-primary">${displayPrice}</span>
                        <span className="text-theme-muted text-lg">/mo</span>
                      </div>

                      {/* Fixed height container for yearly billing text to keep alignment */}
                      <div className="h-6 mb-4 text-center">
                        {billingCycle === 'yearly' && plan.price > 0 && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Billed ${price}/year
                          </p>
                        )}
                      </div>

                      {/* Fixed height description to ensure button alignment */}
                      <p className="text-theme-secondary mb-6 text-center h-14 text-sm">{plan.description}</p>

                      {/* Button - all buttons aligned due to fixed heights above */}
                      <div className="mb-6">
                        <button
                          onClick={() => navigate(`/signup?plan=${plan.name.toLowerCase()}&billing=${billingCycle}`)}
                          className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base transition-all duration-300 ${
                            plan.featured
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-[1.02]'
                              : 'bg-gradient-to-r from-purple-500/80 to-blue-500/80 text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] border border-purple-400/30'
                          }`}
                        >
                          {plan.cta}
                        </button>
                      </div>

                      <div className="space-y-3 flex-grow">
                        <p className="text-sm font-semibold text-theme-primary uppercase tracking-wide">
                          {plan.name} includes:
                        </p>
                        <ul className="space-y-2.5">
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

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-5xl mx-auto mb-20 px-4 pt-12"
          >
            <h2 className="text-3xl font-bold text-theme-primary text-center mb-8">
              Compare All Features
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full bg-slate-900/50 rounded-2xl border border-purple-500/30 overflow-hidden">
                <thead>
                  <tr className="border-b border-purple-500/30">
                    <th className="text-left p-4 text-theme-primary font-semibold">Feature</th>
                    <th className="p-4 text-theme-primary font-semibold text-center">Free</th>
                    <th className="p-4 text-theme-primary font-semibold text-center">Starter</th>
                    <th className="p-4 text-theme-primary font-semibold text-center bg-purple-500/10">Pro</th>
                    <th className="p-4 text-theme-primary font-semibold text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((row, index) => (
                    <tr key={index} className={`border-b border-slate-700/50 ${index % 2 === 0 ? 'bg-slate-800/30' : ''}`}>
                      <td className="p-4 text-theme-secondary text-sm">{row.feature}</td>
                      <td className="p-4 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-slate-500 mx-auto" />
                        ) : (
                          <span className="text-theme-secondary text-sm">{row.free}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.starter === 'boolean' ? (
                          row.starter ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-slate-500 mx-auto" />
                        ) : (
                          <span className="text-theme-secondary text-sm">{row.starter}</span>
                        )}
                      </td>
                      <td className="p-4 text-center bg-purple-500/5">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-slate-500 mx-auto" />
                        ) : (
                          <span className="text-theme-secondary text-sm">{row.pro}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-slate-500 mx-auto" />
                        ) : (
                          <span className="text-theme-secondary text-sm">{row.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

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
    targetAudience: 'Individuals',
    description: 'Try out Githaforge and build your first chatbot. No cost, just creativity.',
    features: [
      '1 chatbot',
      '1,000 messages/month',
      '1 document',
      '1 team member',
      'Basic analytics',
      'Email support'
    ],
    cta: 'Get Started',
    featured: false,
    isCustom: false,
    hasTrial: false,
  },
  {
    name: 'Starter',
    price: 30,
    targetAudience: 'Freelancers & Solopreneurs',
    description: 'Perfect for small projects and personal websites with moderate traffic.',
    features: [
      '2 chatbots',
      '5,000 messages/month',
      '3 documents',
      '2 team members',
      'Basic analytics',
      'Custom branding',
      'Email support'
    ],
    cta: 'Start Free Trial',
    featured: false,
    isCustom: false,
    hasTrial: true,
  },
  {
    name: 'Pro',
    price: 50,
    targetAudience: 'Small Teams & Agencies',
    description: 'Scale your customer support with advanced features and priority assistance.',
    features: [
      '5 chatbots',
      '15,000 messages/month',
      '5 documents',
      '5 team members',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'API access'
    ],
    cta: 'Start Free Trial',
    featured: true,
    isCustom: false,
    hasTrial: true,
  },
  {
    name: 'Enterprise',
    price: 100,
    targetAudience: 'Organizations',
    description: 'Full-scale solution with white-label options and dedicated support.',
    features: [
      '15 chatbots',
      '50,000 messages/month',
      '10 documents',
      '15 team members',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee'
    ],
    cta: 'Start Free Trial',
    featured: false,
    isCustom: false,
    hasTrial: true,
  },
];

// Feature comparison table data
const featureComparison: Array<{
  feature: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}> = [
  { feature: 'Chatbots', free: '1', starter: '2', pro: '5', enterprise: '15' },
  { feature: 'Messages per month', free: '1,000', starter: '5,000', pro: '15,000', enterprise: '50,000' },
  { feature: 'Documents', free: '1', starter: '3', pro: '5', enterprise: '10' },
  { feature: 'Team members', free: '1', starter: '2', pro: '5', enterprise: '15' },
  { feature: 'Basic analytics', free: true, starter: true, pro: true, enterprise: true },
  { feature: 'Advanced analytics', free: false, starter: false, pro: true, enterprise: true },
  { feature: 'Custom branding', free: false, starter: true, pro: true, enterprise: true },
  { feature: 'API access', free: false, starter: false, pro: true, enterprise: true },
  { feature: 'Priority support', free: false, starter: false, pro: true, enterprise: true },
  { feature: 'Dedicated support', free: false, starter: false, pro: false, enterprise: true },
  { feature: 'White-label solution', free: false, starter: false, pro: false, enterprise: true },
  { feature: 'Custom integrations', free: false, starter: false, pro: false, enterprise: true },
  { feature: 'SLA guarantee', free: false, starter: false, pro: false, enterprise: true },
];

