import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Badge, GlowButton, GlowBox, Select } from '../components/ui';
import {
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Bot,
  Eye,
  EyeOff,
  Check,
  X,
  Briefcase,
  Globe,
  Users,
  Sparkles,
  Shield,
  Zap,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { NavigationNew } from '../components/NavigationNew';
import { Footer } from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import type { AccountType, UnifiedSignupRequest } from '../types';
import toast from 'react-hot-toast';

// Step configuration
const STEPS = [
  { id: 1, name: 'Account Type', description: 'Choose how you want to use Githaforge' },
  { id: 2, name: 'Your Details', description: 'Tell us about yourself' },
  { id: 3, name: 'Workspace', description: 'Set up your workspace' },
  { id: 4, name: 'Security', description: 'Secure your account' },
];

const benefits = [
  { icon: Zap, text: 'Setup in under 5 minutes' },
  { icon: Shield, text: 'Enterprise-grade security' },
  { icon: Sparkles, text: 'AI-powered responses' },
];

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

const industryOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
];

const calculatePasswordStrength = (password: string) => {
  if (!password) return { percent: 0, label: '', color: '', bgColor: '' };

  let strength = 0;

  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

  if (strength <= 40) {
    return { percent: strength, label: 'Weak', color: 'text-red-400', bgColor: 'bg-red-500' };
  } else if (strength <= 70) {
    return { percent: strength, label: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
  } else {
    return { percent: strength, label: 'Strong', color: 'text-green-400', bgColor: 'bg-green-500' };
  }
};

// Progress Bar Component
const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  return (
    <div className="w-full mb-8">
      {/* Step indicators */}
      <div className="flex justify-between items-center mb-3">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300 z-10 relative
                  ${index + 1 < currentStep
                    ? 'bg-green-500 text-white'
                    : index + 1 === currentStep
                      ? 'bg-purple-500 text-white ring-4 ring-purple-500/30'
                      : 'bg-slate-700 text-slate-400'
                  }
                `}
              >
                {index + 1 < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>

              {/* Connector line */}
              {index < totalSteps - 1 && (
                <div className="flex-1 h-1 mx-2">
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      index + 1 < currentStep ? 'bg-green-500' : 'bg-slate-700'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Step label - only show on larger screens */}
            <span className={`
              text-xs mt-2 text-center hidden sm:block
              ${index + 1 === currentStep ? 'text-purple-400 font-medium' : 'text-slate-500'}
            `}>
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {/* Current step description */}
      <div className="text-center">
        <p className="text-slate-400 text-sm">
          Step {currentStep} of {totalSteps}: <span className="text-purple-400">{STEPS[currentStep - 1].description}</span>
        </p>
      </div>
    </div>
  );
};

// Step 1: Account Type Selection
const Step1AccountType: React.FC<{
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
}> = ({ accountType, setAccountType }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">How will you use Githaforge?</h2>
        <p className="text-slate-400">Select the option that best describes your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Option */}
        <button
          type="button"
          onClick={() => setAccountType('company')}
          className={`
            p-6 rounded-xl border-2 transition-all duration-300 text-left
            ${accountType === 'company'
              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
              : 'border-slate-700 hover:border-purple-500/50 bg-slate-800/50'
            }
          `}
        >
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center mb-4
            ${accountType === 'company' ? 'bg-purple-500' : 'bg-slate-700'}
          `}>
            <Building2 className={`w-7 h-7 ${accountType === 'company' ? 'text-white' : 'text-slate-400'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${accountType === 'company' ? 'text-white' : 'text-slate-300'}`}>
            For my Company
          </h3>
          <p className="text-sm text-slate-400">
            Perfect for teams and organizations. Invite team members, manage roles, and collaborate on chatbot development.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">Team Collaboration</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">Role Management</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">Advanced Analytics</span>
          </div>
        </button>

        {/* Individual Option */}
        <button
          type="button"
          onClick={() => setAccountType('individual')}
          className={`
            p-6 rounded-xl border-2 transition-all duration-300 text-left
            ${accountType === 'individual'
              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
              : 'border-slate-700 hover:border-purple-500/50 bg-slate-800/50'
            }
          `}
        >
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center mb-4
            ${accountType === 'individual' ? 'bg-purple-500' : 'bg-slate-700'}
          `}>
            <User className={`w-7 h-7 ${accountType === 'individual' ? 'text-white' : 'text-slate-400'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${accountType === 'individual' ? 'text-white' : 'text-slate-300'}`}>
            Just for Me
          </h3>
          <p className="text-sm text-slate-400">
            Ideal for freelancers, solo entrepreneurs, or personal projects. Start small and upgrade anytime.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">Personal Workspace</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">Quick Setup</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400">Upgrade Anytime</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};

// Image Upload Component
const ImageUpload: React.FC<{
  label: string;
  preview: string;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  icon: React.ReactNode;
  shape?: 'circle' | 'square';
  size?: 'small' | 'medium' | 'large';
  helperText?: string;
}> = ({ label, preview, onFileSelect, onClear, icon, shape = 'circle', size = 'medium', helperText }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      onFileSelect(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div
        className={`
          relative ${sizeClasses[size]}
          ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'}
          bg-slate-800/50 border-2 border-dashed border-slate-600
          hover:border-purple-500/50 transition-all cursor-pointer
          overflow-hidden group
        `}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 group-hover:text-purple-400 transition-colors">
            {icon}
            <Upload className="w-4 h-4 mt-1" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
      </div>
      {helperText && (
        <span className="text-xs text-slate-500">{helperText}</span>
      )}
    </div>
  );
};

// Step 2: Personal/Company Details
const Step2Details: React.FC<{
  accountType: AccountType;
  formData: any;
  handleInputChange: (field: string, value: string) => void;
  errors: Record<string, string>;
  profilePhotoPreview: string;
  companyLogoPreview: string;
  onProfilePhotoSelect: (file: File) => void;
  onCompanyLogoSelect: (file: File) => void;
  onProfilePhotoClear: () => void;
  onCompanyLogoClear: () => void;
}> = ({
  accountType,
  formData,
  handleInputChange,
  errors,
  profilePhotoPreview,
  companyLogoPreview,
  onProfilePhotoSelect,
  onCompanyLogoSelect,
  onProfilePhotoClear,
  onCompanyLogoClear
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {accountType === 'company' ? 'About You & Your Company' : 'About You'}
        </h2>
        <p className="text-slate-400">We'll use this to personalize your experience</p>
      </div>

      {/* Profile Photo Upload */}
      <div className="flex justify-center mb-6">
        <ImageUpload
          label="Profile Photo"
          preview={profilePhotoPreview}
          onFileSelect={onProfilePhotoSelect}
          onClear={onProfilePhotoClear}
          icon={<User className="w-8 h-8" />}
          shape="circle"
          size="large"
          helperText="Optional - Max 2MB"
        />
      </div>

      {/* Personal Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          placeholder="John"
          icon={<User className="w-5 h-5" />}
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          error={errors.firstName}
          fullWidth
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          error={errors.lastName}
          fullWidth
        />
      </div>

      {/* Email Field - Contact email */}
      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        icon={<Mail className="w-5 h-5" />}
        value={formData.email}
        onChange={(e) => handleInputChange('email', e.target.value)}
        error={errors.email}
        helperText="This will be used as your primary contact email"
        fullWidth
      />

      {/* Company Details (only for company accounts) */}
      {accountType === 'company' && (
        <>
          <div className="border-t border-slate-700 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Company Information
            </h3>
          </div>

          {/* Company Logo Upload */}
          <div className="flex justify-center mb-6">
            <ImageUpload
              label="Company Logo"
              preview={companyLogoPreview}
              onFileSelect={onCompanyLogoSelect}
              onClear={onCompanyLogoClear}
              icon={<ImageIcon className="w-8 h-8" />}
              shape="square"
              size="large"
              helperText="Optional - Max 2MB"
            />
          </div>

          <Input
            label="Company Name"
            placeholder="Acme Inc."
            icon={<Building2 className="w-5 h-5" />}
            value={formData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            error={errors.companyName}
            fullWidth
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Industry"
              options={[{ value: '', label: 'Select industry...' }, ...industryOptions]}
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              fullWidth
            />
            <Select
              label="Company Size"
              options={[{ value: '', label: 'Select size...' }, ...companySizeOptions]}
              value={formData.companySize}
              onChange={(e) => handleInputChange('companySize', e.target.value)}
              fullWidth
            />
          </div>

          <Input
            label="Company Website (Optional)"
            placeholder="https://yourcompany.com"
            icon={<Globe className="w-5 h-5" />}
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            fullWidth
          />
        </>
      )}
    </motion.div>
  );
};

// Step 3: Workspace Setup
const Step3Workspace: React.FC<{
  accountType: AccountType;
  formData: any;
  handleInputChange: (field: string, value: string) => void;
  errors: Record<string, string>;
  companyLogoPreview: string;
  profilePhotoPreview: string;
}> = ({ accountType, formData, handleInputChange, errors, companyLogoPreview, profilePhotoPreview }) => {
  const defaultWorkspaceName = accountType === 'company'
    ? formData.companyName || 'My Workspace'
    : `${formData.firstName || 'My'}'s Workspace`;

  // Determine which image to show in workspace preview
  const workspaceImage = accountType === 'company' ? companyLogoPreview : profilePhotoPreview;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Set Up Your Workspace</h2>
        <p className="text-slate-400">Your workspace is where you'll manage your chatbots and team</p>
      </div>

      {/* Workspace Preview */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-4 mb-4">
          {workspaceImage ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-purple-500/30">
              <img
                src={workspaceImage}
                alt="Workspace"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              {accountType === 'company' ? (
                <Building2 className="w-8 h-8 text-white" />
              ) : (
                <Briefcase className="w-8 h-8 text-white" />
              )}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">
              {formData.workspaceName || defaultWorkspaceName}
            </h3>
            <p className="text-sm text-slate-400">
              {accountType === 'company' ? 'Team Workspace' : 'Personal Workspace'}
            </p>
          </div>
        </div>
      </div>

      <Input
        label="Workspace Name (Optional)"
        placeholder={defaultWorkspaceName}
        helperText="Leave blank to use the default name"
        icon={<Briefcase className="w-5 h-5" />}
        value={formData.workspaceName}
        onChange={(e) => handleInputChange('workspaceName', e.target.value)}
        error={errors.workspaceName}
        fullWidth
      />

      {/* Features Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <Bot className="w-8 h-8 text-purple-400 mb-3" />
          <h4 className="font-medium text-white mb-1">AI Chatbots</h4>
          <p className="text-xs text-slate-400">Create intelligent chatbots for your website</p>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <Users className="w-8 h-8 text-blue-400 mb-3" />
          <h4 className="font-medium text-white mb-1">Team Access</h4>
          <p className="text-xs text-slate-400">
            {accountType === 'company' ? 'Invite up to 5 team members' : 'Upgrade for team access'}
          </p>
        </div>
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <Sparkles className="w-8 h-8 text-yellow-400 mb-3" />
          <h4 className="font-medium text-white mb-1">14-Day Trial</h4>
          <p className="text-xs text-slate-400">Full access to all Pro features</p>
        </div>
      </div>
    </motion.div>
  );
};

// Step 4: Security (Email & Password)
const Step4Security: React.FC<{
  formData: any;
  handleInputChange: (field: string, value: string) => void;
  errors: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  useDifferentSigninEmail: boolean;
  setUseDifferentSigninEmail: (use: boolean) => void;
  profilePhotoPreview: string;
}> = ({ formData, handleInputChange, errors, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword, useDifferentSigninEmail, setUseDifferentSigninEmail, profilePhotoPreview }) => {
  const passwordStrength = calculatePasswordStrength(formData.password);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Secure Your Account</h2>
        <p className="text-slate-400">Set up your login credentials</p>
      </div>

      {/* Signin Email Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Sign-in Email</label>
          {!useDifferentSigninEmail && (
            <button
              type="button"
              onClick={() => setUseDifferentSigninEmail(true)}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Use a different email for sign-in
            </button>
          )}
        </div>

        {useDifferentSigninEmail ? (
          <div className="space-y-3">
            {/* Show contact email as reference */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              {profilePhotoPreview ? (
                <img src={profilePhotoPreview} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <Mail className="w-5 h-5 text-slate-400" />
              )}
              <div className="flex-1">
                <p className="text-xs text-slate-500">Contact email</p>
                <p className="text-sm text-slate-300">{formData.email || 'Not provided'}</p>
              </div>
            </div>

            {/* Different signin email input */}
            <Input
              label="Sign-in Email"
              type="email"
              placeholder="signin@example.com"
              icon={<Mail className="w-5 h-5" />}
              value={formData.signinEmail}
              onChange={(e) => handleInputChange('signinEmail', e.target.value)}
              error={errors.signinEmail}
              helperText="This email will be used to log into your account"
              fullWidth
            />

            <button
              type="button"
              onClick={() => {
                setUseDifferentSigninEmail(false);
                handleInputChange('signinEmail', '');
              }}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Use same email for sign-in
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            {profilePhotoPreview ? (
              <img src={profilePhotoPreview} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{formData.email || 'No email provided'}</p>
              <p className="text-xs text-slate-400">You'll use this email to sign in</p>
            </div>
            <Check className="w-5 h-5 text-green-400" />
          </div>
        )}
      </div>

      {/* Password */}
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Create a strong password"
          icon={<Lock className="w-5 h-5" />}
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          error={errors.password}
          fullWidth
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[38px] text-slate-400 hover:text-white transition-colors"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${passwordStrength.bgColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${passwordStrength.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className={`text-sm font-medium ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center gap-1 ${formData.password.length >= 8 ? 'text-green-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> 8+ characters
              </div>
              <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.password) ? 'text-green-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Uppercase letter
              </div>
              <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.password) ? 'text-green-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Number
              </div>
              <div className={`flex items-center gap-1 ${/[^a-zA-Z0-9]/.test(formData.password) ? 'text-green-400' : 'text-slate-500'}`}>
                <Check className="w-3 h-3" /> Special character
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="relative">
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Confirm your password"
          icon={<Lock className="w-5 h-5" />}
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          fullWidth
        />
        <button
          type="button"
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-[38px] text-slate-400 hover:text-white transition-colors"
        >
          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>

        {/* Match indicator */}
        {formData.confirmPassword && (
          <div className={`mt-2 flex items-center gap-2 text-sm ${
            formData.password === formData.confirmPassword ? 'text-green-400' : 'text-red-400'
          }`}>
            {formData.password === formData.confirmPassword ? (
              <><Check className="w-4 h-4" /> Passwords match</>
            ) : (
              <><X className="w-4 h-4" /> Passwords don't match</>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Main Signup Component
export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup: authSignup } = useAuth();
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get('plan') || 'free';

  const [currentStep, setCurrentStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType>('company');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    industry: '',
    companySize: '',
    website: '',
    workspaceName: '',
    email: '',
    signinEmail: '', // Separate signin email (optional)
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useDifferentSigninEmail, setUseDifferentSigninEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Image upload states
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>('');

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Image upload handlers
  const handleProfilePhotoSelect = useCallback((file: File) => {
    setProfilePhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCompanyLogoSelect = useCallback((file: File) => {
    setCompanyLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCompanyLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleProfilePhotoClear = useCallback(() => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview('');
  }, []);

  const handleCompanyLogoClear = useCallback(() => {
    setCompanyLogoFile(null);
    setCompanyLogoPreview('');
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        // Account type is always selected, no validation needed
        break;

      case 2:
        if (!formData.firstName.trim()) {
          newErrors.firstName = 'First name is required';
        }
        if (!formData.lastName.trim()) {
          newErrors.lastName = 'Last name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Invalid email address';
        }
        if (accountType === 'company' && !formData.companyName.trim()) {
          newErrors.companyName = 'Company name is required';
        }
        break;

      case 3:
        // Workspace name is optional
        break;

      case 4:
        // Validate signin email if using a different one
        if (useDifferentSigninEmail) {
          if (!formData.signinEmail.trim()) {
            newErrors.signinEmail = 'Sign-in email is required';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.signinEmail)) {
            newErrors.signinEmail = 'Invalid email address';
          }
        }
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only submit on the final step
    if (currentStep !== STEPS.length) {
      // If Enter is pressed on an earlier step, just advance to next step
      handleNext();
      return;
    }

    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);

    try {
      // Determine which email to use for signin
      const signinEmailToUse = useDifferentSigninEmail && formData.signinEmail
        ? formData.signinEmail
        : formData.email;

      const signupData: UnifiedSignupRequest = {
        account_type: accountType,
        email: signinEmailToUse, // This is the signin email
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        subscription_tier: (planFromUrl as 'free' | 'pro' | 'enterprise') || 'free',
        // Store contact email if different from signin email
        contact_email: useDifferentSigninEmail ? formData.email : undefined,
      };

      if (accountType === 'company') {
        signupData.company_name = formData.workspaceName || formData.companyName;
        signupData.industry = formData.industry || undefined;
        signupData.company_size = formData.companySize as any || undefined;
        signupData.website = formData.website || undefined;
      } else {
        // For individual, use workspace name or generate default
        const workspaceName = formData.workspaceName || `${formData.firstName}'s Workspace`;
        signupData.company_name = workspaceName;
      }

      await authSignup(signupData);

      // TODO: After signup, upload profile photo and company logo if provided
      // This would require additional API endpoints for image uploads
      // For now, the images are stored locally and can be uploaded after signup

      navigate('/admin');
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create account. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1AccountType accountType={accountType} setAccountType={setAccountType} />;
      case 2:
        return (
          <Step2Details
            accountType={accountType}
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            profilePhotoPreview={profilePhotoPreview}
            companyLogoPreview={companyLogoPreview}
            onProfilePhotoSelect={handleProfilePhotoSelect}
            onCompanyLogoSelect={handleCompanyLogoSelect}
            onProfilePhotoClear={handleProfilePhotoClear}
            onCompanyLogoClear={handleCompanyLogoClear}
          />
        );
      case 3:
        return (
          <Step3Workspace
            accountType={accountType}
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            companyLogoPreview={companyLogoPreview}
            profilePhotoPreview={profilePhotoPreview}
          />
        );
      case 4:
        return (
          <Step4Security
            formData={formData}
            handleInputChange={handleInputChange}
            errors={errors}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            useDifferentSigninEmail={useDifferentSigninEmail}
            setUseDifferentSigninEmail={setUseDifferentSigninEmail}
            profilePhotoPreview={profilePhotoPreview}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <NavigationNew />

      <div className="flex items-center justify-center p-4 pt-40 pb-16">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
            animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="w-full max-w-4xl relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-display font-bold text-white">Githaforge</span>
            </div>
            {planFromUrl !== 'free' && (
              <Badge variant="primary" size="sm" rounded>
                {planFromUrl.toUpperCase()} Plan
              </Badge>
            )}
          </motion.div>

          {/* Main Card */}
          <GlowBox
            glowColor="#a855f7"
            glowIntensity="medium"
            glowEffect="pulse"
            borderGlow
            sx={{
              background: 'rgba(15, 23, 42, 0.8)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              p: 0,
              border: '1px solid rgba(168, 85, 247, 0.3)',
            }}
          >
            <div className="p-8">
              {/* Progress Bar */}
              <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} />

              {/* Step Content */}
              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {renderStep()}
                </AnimatePresence>

                {/* Error Message */}
                {errors.submit && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30"
                  >
                    <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-400">{errors.submit}</span>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                  ) : (
                    <div /> // Spacer
                  )}

                  {currentStep < STEPS.length ? (
                    <GlowButton
                      type="button"
                      onClick={handleNext}
                      glowColor="#a855f7"
                      glowVariant="gradient"
                      size="large"
                      endIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Continue
                    </GlowButton>
                  ) : (
                    <GlowButton
                      type="submit"
                      glowColor="#a855f7"
                      glowVariant="gradient"
                      size="large"
                      disabled={isLoading}
                      endIcon={isLoading ? null : <ArrowRight className="w-4 h-4" />}
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </GlowButton>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <p className="text-xs text-center text-slate-500 mb-4">
                  By signing up, you agree to our{' '}
                  <a href="#" className="text-purple-400 hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
                </p>

                <div className="text-center">
                  <span className="text-slate-400">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-purple-400 hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          </GlowBox>

          {/* Benefits - Below Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex justify-center gap-8"
          >
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-slate-400">
                <benefit.icon className="w-5 h-5 text-purple-400" />
                <span className="text-sm">{benefit.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};