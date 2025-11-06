import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Card, Badge, GlowButton, GlowBox } from '../components/ui';
import { Bot, Building2, Palette, CheckCircle2, ArrowRight, ArrowLeft, Upload } from 'lucide-react';

type OnboardingStep = 1 | 2 | 3 | 4;

interface OnboardingData {
  // Step 1: Company Info
  companyName: string;
  industry: string;
  website: string;

  // Step 2: Branding
  primaryColor: string;
  secondaryColor: string;
  logo: File | null;

  // Step 3: Chatbot Config
  chatbotName: string;
  welcomeMessage: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    industry: '',
    website: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#06b6d4',
    logo: null,
    chatbotName: 'AI Assistant',
    welcomeMessage: 'Hi! How can I help you today?',
    position: 'bottom-right',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData({ ...data, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateStep = (step: OnboardingStep): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!data.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!data.industry.trim()) newErrors.industry = 'Industry is required';
    } else if (step === 3) {
      if (!data.chatbotName.trim()) newErrors.chatbotName = 'Chatbot name is required';
      if (!data.welcomeMessage.trim()) newErrors.welcomeMessage = 'Welcome message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const handleComplete = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      // TODO: Call API to save onboarding data
      // POST /api/v1/onboarding
      const payload = {
        company_name: data.companyName,
        industry: data.industry,
        website: data.website,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        // logo: data.logo (upload separately),
        chatbot_name: data.chatbotName,
        welcome_message: data.welcomeMessage,
        widget_position: data.position,
      };

      console.log('Onboarding payload:', payload);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      setErrors({ submit: 'Failed to complete onboarding. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-theme-primary">
              Welcome to Githaforge
            </h1>
          </div>
          <p className="text-theme-secondary">
            Let's set up your AI chatbot in just a few steps
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-theme-secondary">
              Step {currentStep} of 4
            </span>
            <span className="text-sm font-medium text-primary-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-theme-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Step Content */}
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
            mb: 3,
          }}
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-theme-primary">Company Information</h2>
                    <p className="text-theme-secondary">Tell us about your business</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <Input
                    label="Company Name"
                    placeholder="Acme Inc."
                    value={data.companyName}
                    onChange={(e) => updateData('companyName', e.target.value)}
                    error={errors.companyName}
                    fullWidth
                  />

                  <Input
                    label="Industry"
                    placeholder="E-commerce, SaaS, Healthcare, etc."
                    value={data.industry}
                    onChange={(e) => updateData('industry', e.target.value)}
                    error={errors.industry}
                    fullWidth
                  />

                  <Input
                    label="Website (Optional)"
                    placeholder="https://example.com"
                    value={data.website}
                    onChange={(e) => updateData('website', e.target.value)}
                    fullWidth
                  />
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                    <Palette className="w-6 h-6 text-accent-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-theme-primary">Brand Colors</h2>
                    <p className="text-theme-secondary">Customize your chatbot's appearance</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-theme-primary mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={data.primaryColor}
                          onChange={(e) => updateData('primaryColor', e.target.value)}
                          className="w-16 h-16 rounded-lg border-2 border-theme cursor-pointer"
                        />
                        <Input
                          value={data.primaryColor}
                          onChange={(e) => updateData('primaryColor', e.target.value)}
                          placeholder="#3b82f6"
                          fullWidth
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-primary mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={data.secondaryColor}
                          onChange={(e) => updateData('secondaryColor', e.target.value)}
                          className="w-16 h-16 rounded-lg border-2 border-theme cursor-pointer"
                        />
                        <Input
                          value={data.secondaryColor}
                          onChange={(e) => updateData('secondaryColor', e.target.value)}
                          placeholder="#06b6d4"
                          fullWidth
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-2">
                      Logo (Optional)
                    </label>
                    <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer">
                      <Upload className="w-12 h-12 text-theme-muted mx-auto mb-3" />
                      <p className="text-theme-secondary mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-theme-muted">PNG, JPG, SVG up to 2MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => updateData('logo', e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                    {data.logo && (
                      <p className="text-sm text-theme-secondary mt-2">
                        Selected: {data.logo.name}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-secondary-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-theme-primary">Chatbot Configuration</h2>
                    <p className="text-theme-secondary">Personalize your AI assistant</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <Input
                    label="Chatbot Name"
                    placeholder="AI Assistant"
                    value={data.chatbotName}
                    onChange={(e) => updateData('chatbotName', e.target.value)}
                    error={errors.chatbotName}
                    fullWidth
                  />

                  <Textarea
                    label="Welcome Message"
                    placeholder="Hi! How can I help you today?"
                    value={data.welcomeMessage}
                    onChange={(e) => updateData('welcomeMessage', e.target.value)}
                    error={errors.welcomeMessage}
                    rows={3}
                    fullWidth
                  />

                  <div>
                    <label className="block text-sm font-medium text-theme-primary mb-3">
                      Widget Position
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => updateData('position', pos)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            data.position === pos
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-theme hover:border-primary-300'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            data.position === pos ? 'text-primary-600' : 'text-theme-secondary'
                          }`}>
                            {pos.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-theme-primary mb-2">All Set!</h2>
                  <p className="text-theme-secondary">Review your configuration</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-theme-secondary">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-theme-muted">Company</span>
                      <Badge variant="primary" size="sm">{data.companyName}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-theme-muted">Industry</span>
                      <span className="text-sm text-theme-secondary">{data.industry}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-theme-secondary">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-theme-muted">Brand Colors</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-white shadow-md"
                          style={{ backgroundColor: data.primaryColor }}
                        />
                        <span className="text-xs text-theme-secondary">{data.primaryColor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border-2 border-white shadow-md"
                          style={{ backgroundColor: data.secondaryColor }}
                        />
                        <span className="text-xs text-theme-secondary">{data.secondaryColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-theme-secondary">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-theme-muted">Chatbot Name</span>
                      <span className="text-sm text-theme-secondary">{data.chatbotName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-theme-muted">Position</span>
                      <Badge variant="secondary" size="sm">{data.position}</Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlowBox>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <GlowButton
            glowColor="#a855f7"
            glowVariant="outline"
            size="large"
            startIcon={<ArrowLeft />}
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
          >
            Back
          </GlowButton>

          {currentStep < 4 ? (
            <GlowButton
              glowColor="#a855f7"
              glowVariant="gradient"
              size="large"
              endIcon={<ArrowRight />}
              onClick={handleNext}
            >
              Continue
            </GlowButton>
          ) : (
            <GlowButton
              glowColor="#a855f7"
              glowVariant="gradient"
              size="large"
              endIcon={<CheckCircle2 />}
              onClick={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? 'Completing...' : 'Complete Setup'}
            </GlowButton>
          )}
        </div>
      </div>
    </div>
  );
};
