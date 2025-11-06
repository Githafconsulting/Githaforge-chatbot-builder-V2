import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardBody, Badge, GlowButton, GlowBox } from '../components/ui';
import { Building2, User, Mail, Lock, ArrowRight, Bot, Eye, EyeOff, Check, X } from 'lucide-react';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';

// Type definition for account selection
type AccountType = 'company' | 'individual';

const benefits = [
  'No credit card required for 14-day trial',
  'Full access to all Pro features',
  'Cancel anytime, no questions asked',
  'Setup your chatbot in under 5 minutes',
];

const calculatePasswordStrength = (password: string) => {
  if (!password) return { percent: 0, label: '', color: '' };

  let strength = 0;

  // Length check
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;

  // Contains lowercase
  if (/[a-z]/.test(password)) strength += 15;

  // Contains uppercase
  if (/[A-Z]/.test(password)) strength += 15;

  // Contains numbers
  if (/[0-9]/.test(password)) strength += 15;

  // Contains special characters
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

  if (strength <= 40) {
    return { percent: strength, label: 'Weak', color: 'text-red-500' };
  } else if (strength <= 70) {
    return { percent: strength, label: 'Fair', color: 'text-yellow-500' };
  } else {
    return { percent: strength, label: 'Strong', color: 'text-green-500' };
  }
};

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get('plan') || 'free';

  const [accountType, setAccountType] = useState<AccountType>('company');
  const [formData, setFormData] = useState({
    // Company fields
    companyName: '',
    // Individual fields
    fullName: '',
    // Common fields
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate based on account type
    if (accountType === 'company' && !formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (accountType === 'individual' && !formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Call API to create account
      // POST /api/v1/auth/signup
      const payload = {
        account_type: accountType,
        company_name: accountType === 'company' ? formData.companyName : null,
        full_name: accountType === 'individual' ? formData.fullName : null,
        email: formData.email,
        password: formData.password,
        subscription_tier: planFromUrl,
      };

      console.log('Signup payload:', payload);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // After successful signup, redirect to onboarding
      navigate('/onboarding');
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ submit: 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavigationNew />
      <div className="flex items-center justify-center p-4 pt-32">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <span className="text-4xl font-display font-bold text-theme-primary">Githaforge</span>
            </div>

            <h1 className="text-5xl font-display font-bold mb-6 text-theme-primary">
              Build Your AI Chatbot Today
            </h1>

            <p className="text-xl text-theme-secondary mb-8">
              Join thousands of businesses using Githaforge to automate customer support with intelligent AI chatbots.
            </p>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-theme-secondary">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlowBox
              glowColor="#a855f7"
              glowIntensity="high"
              glowEffect="rotating"
              borderGlow
              sx={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                p: 0,
                border: '2px solid #a855f7',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.7), inset 0 0 15px rgba(168, 85, 247, 0.3)',
              }}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-bold text-theme-primary">Create Account</h2>
                  {planFromUrl !== 'free' && (
                    <Badge variant="primary" size="sm" rounded>
                      {planFromUrl.toUpperCase()} Plan
                    </Badge>
                  )}
                </div>
                <p className="text-theme-secondary mb-6">
                  Start your 14-day free trial. No credit card required.
                </p>
              </div>

              <div className="px-8 pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Account Type Selection */}
                  <div>
                    <label className="text-sm font-medium text-theme-primary mb-2 block">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAccountType('company')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          accountType === 'company'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-theme hover:border-primary-300'
                        }`}
                      >
                        <Building2 className={`w-6 h-6 mx-auto mb-2 ${
                          accountType === 'company' ? 'text-primary-600' : 'text-theme-muted'
                        }`} />
                        <span className={`text-sm font-medium ${
                          accountType === 'company' ? 'text-primary-600' : 'text-theme-secondary'
                        }`}>
                          Company
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountType('individual')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          accountType === 'individual'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-theme hover:border-primary-300'
                        }`}
                      >
                        <User className={`w-6 h-6 mx-auto mb-2 ${
                          accountType === 'individual' ? 'text-primary-600' : 'text-theme-muted'
                        }`} />
                        <span className={`text-sm font-medium ${
                          accountType === 'individual' ? 'text-primary-600' : 'text-theme-secondary'
                        }`}>
                          Individual
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Company Name (if company) */}
                  {accountType === 'company' && (
                    <Input
                      label="Company Name"
                      placeholder="Acme Inc."
                      icon={<Building2 className="w-5 h-5" />}
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      error={errors.companyName}
                      fullWidth
                    />
                  )}

                  {/* Full Name (if individual) */}
                  {accountType === 'individual' && (
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      icon={<User className="w-5 h-5" />}
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      error={errors.fullName}
                      fullWidth
                    />
                  )}

                  {/* Email */}
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail className="w-5 h-5" />}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={errors.email}
                    fullWidth
                  />

                  {/* Password */}
                  <div>
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      icon={<Lock className="w-5 h-5" />}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      error={errors.password}
                      fullWidth
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[38px] text-theme-muted hover:text-theme-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>

                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-theme-secondary rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${passwordStrength.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${passwordStrength.percent}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${passwordStrength.color}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <Input
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      icon={<Lock className="w-5 h-5" />}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      error={errors.confirmPassword}
                      fullWidth
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-[38px] text-theme-muted hover:text-theme-primary"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">{errors.submit}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <GlowButton
                    type="submit"
                    glowColor="#a855f7"
                    glowVariant="gradient"
                    size="large"
                    fullWidth
                    disabled={isLoading}
                    endIcon={<ArrowRight />}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </GlowButton>

                  {/* Terms */}
                  <p className="text-xs text-center text-theme-muted">
                    By signing up, you agree to our{' '}
                    <a href="#" className="text-primary-600 hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
                  </p>

                  {/* Sign In Link */}
                  <div className="text-center pt-4 border-t border-theme">
                    <span className="text-theme-secondary">Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            </GlowBox>
          </motion.div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};
