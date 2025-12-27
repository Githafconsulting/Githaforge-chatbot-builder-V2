import React from 'react';
import { motion } from 'framer-motion';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Badge, GlowBox, GlowButton } from '../components/ui';
import { Star, Quote, Rocket, ArrowRight, Building2, Users, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Dummy reviews data
const reviews = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Customer Success Manager',
    company: 'TechFlow Solutions',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=6366f1&color=fff&bold=true',
    rating: 5,
    review: 'Githaforge transformed our customer support completely. We reduced response times by 70% and our customers love the instant, accurate answers. The RAG technology is incredible!',
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'CTO',
    company: 'StartupHub Inc.',
    avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=10b981&color=fff&bold=true',
    rating: 5,
    review: 'As a tech startup, we needed something that could scale with us. Githaforge was up and running in under an hour, and the customization options are fantastic. Highly recommended!',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Head of Operations',
    company: 'Global Retail Co.',
    avatar: 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=f97316&color=fff&bold=true',
    rating: 5,
    review: 'We handle thousands of customer queries daily. Githaforge handles 80% of them automatically with accurate, contextual responses. Our support team can now focus on complex issues.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 4,
    name: 'David Kim',
    role: 'Product Manager',
    company: 'FinServe Pro',
    avatar: 'https://ui-avatars.com/api/?name=David+Kim&background=3b82f6&color=fff&bold=true',
    rating: 5,
    review: 'The knowledge base feature is a game-changer. We uploaded our documentation and the chatbot immediately started providing accurate answers. Setup was incredibly easy.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 5,
    name: 'Amanda Foster',
    role: 'Marketing Director',
    company: 'Creative Agency X',
    avatar: 'https://ui-avatars.com/api/?name=Amanda+Foster&background=ec4899&color=fff&bold=true',
    rating: 4,
    review: 'Our clients love the branded chatbot experience. The customization options let us match each client\'s brand perfectly. It\'s become a key part of our service offering.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    id: 6,
    name: 'James Wilson',
    role: 'IT Director',
    company: 'Healthcare Plus',
    avatar: 'https://ui-avatars.com/api/?name=James+Wilson&background=8b5cf6&color=fff&bold=true',
    rating: 5,
    review: 'Security and compliance were our top concerns. Githaforge met all our requirements, and the team was incredibly helpful during implementation. Excellent support!',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 7,
    name: 'Lisa Thompson',
    role: 'E-commerce Manager',
    company: 'ShopDirect',
    avatar: 'https://ui-avatars.com/api/?name=Lisa+Thompson&background=14b8a6&color=fff&bold=true',
    rating: 5,
    review: 'Our conversion rates improved by 25% after adding Githaforge to our site. Customers get instant answers about products, shipping, and returns. It\'s like having 24/7 sales support.',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    id: 8,
    name: 'Robert Martinez',
    role: 'CEO',
    company: 'ConsultPro Services',
    avatar: 'https://ui-avatars.com/api/?name=Robert+Martinez&background=eab308&color=fff&bold=true',
    rating: 5,
    review: 'We\'ve tried many chatbot solutions, but Githaforge is in a different league. The AI actually understands context and provides relevant answers. Worth every penny!',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    id: 9,
    name: 'Jennifer Lee',
    role: 'Support Team Lead',
    company: 'SaaS Platform Co.',
    avatar: 'https://ui-avatars.com/api/?name=Jennifer+Lee&background=ef4444&color=fff&bold=true',
    rating: 4,
    review: 'The analytics dashboard gives us incredible insights into what our customers are asking about. We\'ve used this data to improve our product and documentation significantly.',
    gradient: 'from-red-500 to-pink-500',
  },
];

// Stats data
const stats = [
  { icon: Building2, value: '500+', label: 'Companies Trust Us', gradient: 'from-blue-500 to-cyan-500' },
  { icon: Users, value: '2M+', label: 'Conversations Handled', gradient: 'from-purple-500 to-pink-500' },
  { icon: TrendingUp, value: '98%', label: 'Customer Satisfaction', gradient: 'from-green-500 to-emerald-500' },
  { icon: Star, value: '4.9/5', label: 'Average Rating', gradient: 'from-yellow-500 to-orange-500' },
];

// Star rating component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
        />
      ))}
    </div>
  );
};

export const Reviews: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavigationNew />

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge variant="secondary" size="lg" rounded className="mb-6">
                <Star className="w-4 h-4" />
                <span className="ml-2">Customer Reviews</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl font-display font-bold mb-6 text-theme-primary"
            >
              Loved by{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Businesses Worldwide
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-theme-secondary mb-8"
            >
              See what our customers have to say about their experience with Githaforge.
              Real reviews from real businesses transforming their customer support.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-theme-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {stats.map((stat, index) => {
              const glowColor = stat.gradient.includes('blue') ? '#3b82f6' :
                               stat.gradient.includes('purple') ? '#a855f7' :
                               stat.gradient.includes('green') ? '#10b981' : '#eab308';

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlowBox
                    glowColor={glowColor}
                    glowIntensity="medium"
                    borderGlow
                    sx={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      p: 3,
                      textAlign: 'center',
                      border: `2px solid ${glowColor}`,
                      boxShadow: `0 0 20px ${glowColor}80`,
                    }}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-white/70">{stat.label}</p>
                  </GlowBox>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {reviews.map((review, index) => {
              const glowColor = review.gradient.includes('purple') ? '#a855f7' :
                               review.gradient.includes('blue') ? '#3b82f6' :
                               review.gradient.includes('green') ? '#10b981' :
                               review.gradient.includes('orange') ? '#f97316' :
                               review.gradient.includes('pink') ? '#ec4899' :
                               review.gradient.includes('violet') ? '#8b5cf6' :
                               review.gradient.includes('teal') ? '#14b8a6' :
                               review.gradient.includes('yellow') ? '#eab308' : '#ef4444';

              return (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index % 3) * 0.1 }}
                >
                  <GlowBox
                    glowColor={glowColor}
                    glowIntensity="high"
                    borderGlow
                    sx={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      p: 4,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: `2px solid ${glowColor}`,
                      boxShadow: `0 0 20px ${glowColor}80`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: `0 0 35px ${glowColor}cc`,
                      }
                    }}
                  >
                    {/* Quote Icon */}
                    <Quote className={`w-8 h-8 mb-4 opacity-50`} style={{ color: glowColor }} />

                    {/* Review Text */}
                    <p className="text-white text-sm leading-relaxed mb-6 flex-1">
                      "{review.review}"
                    </p>

                    {/* Rating */}
                    <div className="mb-4">
                      <StarRating rating={review.rating} />
                    </div>

                    {/* Reviewer Info */}
                    <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                      <img
                        src={review.avatar}
                        alt={review.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <p className="font-semibold text-theme-primary">{review.name}</p>
                        <p className="text-sm text-white/60">{review.role}</p>
                        <p className={`text-xs font-medium bg-gradient-to-r ${review.gradient} bg-clip-text text-transparent`}>
                          {review.company}
                        </p>
                      </div>
                    </div>
                  </GlowBox>
                </motion.div>
              );
            })}
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
              Join Thousands of Happy Customers
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Start your free trial today and see why businesses love Githaforge
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                onClick={() => navigate('/contact')}
                sx={{ color: 'white !important' }}
              >
                Talk to Sales
              </GlowButton>
            </div>
            <p className="text-sm text-blue-100 mt-4">No credit card required • 14-day free trial</p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};