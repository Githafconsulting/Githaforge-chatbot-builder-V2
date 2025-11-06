import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { GlowButton, GlowBox, Input } from '../components/ui';
import { fadeInUp, scaleIn, staggerContainer, staggerItem } from '../utils/animations';
import { Lock, Mail, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username: email, password });
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-theme-primary">

      {/* Top Bar with Back, Logo & App Name, Language & Theme */}
      <motion.div
        className="absolute top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 flex flex-col md:flex-row items-center gap-4 md:justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* First Row on Mobile: Back to Home and Language/Theme */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Left: Back to Home */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-primary-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">{t('nav.backToHome')}</span>
          </Link>

          {/* Right on Mobile: Language & Theme */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        {/* Second Row on Mobile / Center on Desktop: Logo & App Name */}
        <div className="flex items-center justify-center gap-2 pt-16 md:pt-0 w-full md:w-auto">
          <img
            src="/githaf_logo.png"
            alt="Githaforge Logo"
            className="w-16 h-16 object-contain"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-theme-primary leading-tight">Githaforge</h1>
            <p className="text-sm text-theme-secondary">AI Chatbot Builder</p>
          </div>
        </div>

        {/* Right on Desktop: Language & Theme */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </motion.div>

      <motion.div
        className="max-w-md w-full space-y-8 relative z-10 mt-40 md:mt-0"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Header */}
        <motion.div variants={staggerItem} className="text-center">
          <h2 className="text-4xl font-display font-bold text-theme-primary">
            {t('auth.welcomeBack')}
          </h2>
          <p className="mt-2 text-theme-secondary">
            {t('auth.signInToDashboard')}
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div variants={staggerItem}>
          <GlowBox
            glowColor="#a855f7"
            glowIntensity="high"
            glowEffect="rotating"
            borderGlow
            sx={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              p: 4,
              border: '2px solid #a855f7',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.7), inset 0 0 15px rgba(168, 85, 247, 0.3)',
            }}
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2"
                >
                  <Lock size={18} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Email Field */}
              <Input
                label={t('auth.email')}
                type="email"
                placeholder={t('auth.enterEmail')}
                icon={<Mail className="w-5 h-5" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />

              {/* Password Field */}
              <div className="relative">
                <Input
                  label={t('auth.password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.enterPassword')}
                  icon={<Lock className="w-5 h-5" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[42px] text-slate-400 hover:text-slate-200 transition-colors z-10"
                  title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Submit Button */}
              <GlowButton
                type="submit"
                glowColor="#a855f7"
                glowVariant="gradient"
                size="large"
                fullWidth
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span>{t('auth.signingIn')}</span>
                  </div>
                ) : (
                  t('auth.signIn')
                )}
              </GlowButton>
            </form>
          </GlowBox>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          variants={fadeInUp}
          className="text-center text-sm card backdrop-blur-sm px-6 py-4 rounded-xl text-theme-secondary"
        >
          <p className="flex items-center justify-center gap-2">
            <ShieldCheck size={16} className="text-primary-400" />
            Secure admin access only
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
