import React from 'react';
import { motion } from 'framer-motion';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { Badge, GlowBox, GlowButton } from '../components/ui';
import { Users, Target, Lightbulb, Heart, ExternalLink, Linkedin, Twitter, Mail, Rocket, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Team members data
const teamMembers = [
  {
    name: 'Debra Bilikha',
    role: 'C.E.O.',
    image: '/team/debra-bilikha.jpg',
    description: 'Visionary leader driving Githaforge\'s mission to democratize AI-powered customer support for businesses worldwide.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Okoye Bilikha',
    role: 'Tech Lead',
    image: '/team/okoye-bilikha.jpg',
    description: 'Technical architect overseeing the development of our cutting-edge AI chatbot platform and infrastructure.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Kaljob Bilikha',
    role: 'Data Analyst',
    image: '/team/kaljob-bilikha.jpg',
    description: 'Data expert transforming insights into actionable intelligence to improve chatbot performance and user experience.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    name: 'Steve Igor Nya Njeudji',
    role: 'Software Eng. | AI Programmer',
    image: '/team/steve-nya.jpg',
    description: 'Full-stack developer and AI specialist building intelligent systems that power seamless customer interactions.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    name: 'Charles Rhingdah Bah',
    role: 'Software Eng. | AI Programmer',
    image: '/team/charles-bah.jpg',
    description: 'Software engineer focused on developing robust AI solutions and optimizing chatbot response accuracy.',
    gradient: 'from-indigo-500 to-purple-500',
  },
];

// Company values
const values = [
  {
    icon: Target,
    title: 'Mission-Driven',
    description: 'We\'re committed to making AI-powered customer support accessible to businesses of all sizes.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Lightbulb,
    title: 'Innovation First',
    description: 'We continuously push the boundaries of what\'s possible with RAG technology and conversational AI.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Heart,
    title: 'Customer Focused',
    description: 'Every feature we build starts with understanding and solving real customer pain points.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: Users,
    title: 'Team Excellence',
    description: 'Our diverse team brings together expertise in AI, software engineering, and business strategy.',
    gradient: 'from-purple-500 to-indigo-500',
  },
];

export const About: React.FC = () => {
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
                <Users className="w-4 h-4" />
                <span className="ml-2">About Us</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl font-display font-bold mb-6 text-theme-primary"
            >
              Powering the Future of{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Customer Support
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-theme-secondary mb-8"
            >
              Githaforge is a product of{' '}
              <a
                href="https://githafconsulting.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-400 inline-flex items-center gap-1"
              >
                Githaf Consulting
                <ExternalLink className="w-4 h-4" />
              </a>
              . We're on a mission to democratize AI-powered customer support, making it accessible and affordable for businesses of all sizes.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 bg-theme-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <GlowBox
                glowColor="#3b82f6"
                glowIntensity="medium"
                borderGlow
                sx={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  p: 4,
                  border: '2px solid #3b82f6',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
                }}
              >
                <h2 className="text-3xl font-display font-bold mb-6 text-theme-primary">Our Story</h2>
                <div className="space-y-4 text-white">
                  <p>
                    Githaforge was born from a simple observation: businesses of all sizes struggle to provide
                    consistent, high-quality customer support without breaking the bank. Traditional chatbots
                    felt robotic and unhelpful, while human support teams couldn't scale efficiently.
                  </p>
                  <p>
                    We set out to build something different — an AI chatbot platform powered by RAG
                    (Retrieval-Augmented Generation) technology that actually understands your business
                    and delivers accurate, contextual responses that feel human.
                  </p>
                  <p>
                    Today, Githaforge helps businesses transform their customer support with intelligent
                    chatbots that can be set up in minutes, not months. Our platform combines cutting-edge
                    AI with an intuitive interface, making advanced technology accessible to everyone.
                  </p>
                </div>
              </GlowBox>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold mb-4 text-theme-primary">Our Values</h2>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, index) => {
              const glowColor = value.gradient.includes('blue') ? '#3b82f6' :
                               value.gradient.includes('yellow') ? '#eab308' :
                               value.gradient.includes('pink') ? '#ec4899' : '#a855f7';

              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlowBox
                    glowColor={glowColor}
                    glowIntensity="high"
                    borderGlow
                    sx={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      p: 3,
                      height: '100%',
                      border: `2px solid ${glowColor}`,
                      boxShadow: `0 0 20px ${glowColor}80`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: `0 0 35px ${glowColor}cc`,
                      }
                    }}
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-4`}>
                      <value.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-theme-primary mb-2">{value.title}</h3>
                    <p className="text-white text-sm">{value.description}</p>
                  </GlowBox>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-theme-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-display font-bold mb-4 text-theme-primary">Meet Our Team</h2>
            <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
              The talented people behind Githaforge
            </p>
          </motion.div>

          <div className="flex flex-col gap-12 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => {
              const glowColor = member.gradient.includes('purple') ? '#a855f7' :
                               member.gradient.includes('blue') ? '#3b82f6' :
                               member.gradient.includes('green') ? '#10b981' :
                               member.gradient.includes('orange') ? '#f97316' : '#6366f1';

              // Alternate: even index = image left, odd index = image right
              const imageOnLeft = index % 2 === 0;

              return (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, x: imageOnLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <GlowBox
                    glowColor={glowColor}
                    glowIntensity="high"
                    glowEffect="rotating"
                    borderGlow
                    sx={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: `2px solid ${glowColor}`,
                      boxShadow: `0 0 20px ${glowColor}80`,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: `0 0 40px ${glowColor}cc`,
                      }
                    }}
                  >
                    <div className={`flex flex-col md:flex-row ${!imageOnLeft ? 'md:flex-row-reverse' : ''}`}>
                      {/* Team Member Photo */}
                      <div className="relative w-full md:w-72 h-64 md:h-72 flex-shrink-0 overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-20`} />
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=256&background=random&color=fff&bold=true`;
                          }}
                        />
                      </div>

                      {/* Team Member Info */}
                      <div className="flex-1 p-6 flex flex-col justify-center">
                        <h3 className="text-2xl font-bold text-theme-primary mb-1">{member.name}</h3>
                        <p className={`text-base font-medium bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent mb-4`}>
                          {member.role}
                        </p>
                        <p className="text-white text-sm leading-relaxed mb-4">
                          {member.description}
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3 pt-4 border-t border-white/10">
                          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-theme-secondary hover:text-theme-primary">
                            <Linkedin className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-theme-secondary hover:text-theme-primary">
                            <Twitter className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-theme-secondary hover:text-theme-primary">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
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
              Ready to Join Our Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Experience the future of customer support with Githaforge
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GlowButton
                glowColor="#a855f7"
                glowVariant="gradient"
                size="large"
                onClick={() => navigate('/signup')}
                startIcon={<Rocket />}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2 inline" />
              </GlowButton>
              <GlowButton
                glowColor="#a855f7"
                glowVariant="outline"
                size="large"
                onClick={() => navigate('/contact')}
                startIcon={<Mail />}
                sx={{ color: 'white !important' }}
              >
                Contact Us
              </GlowButton>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
