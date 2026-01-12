import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Palette,
  Crown,
  Save,
  Upload,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Globe,
  Users as UsersIcon,
  Briefcase,
  Tag,
  Shield
} from 'lucide-react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  slug?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  plan?: string;  // Backend uses 'plan' field with values: free, pro, enterprise
  plan_tier?: string;  // Alias for compatibility
  max_bots: number;
  max_documents: number;
  max_monthly_messages: number;
  custom_scopes?: string[];
  created_at: string;
  updated_at?: string;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Education',
  'Manufacturing',
  'Real Estate',
  'Legal',
  'Consulting',
  'Other'
];

const COMPANY_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+'
];

const PLAN_TIERS: Record<string, { name: string; color: string; bgColor: string; borderColor: string }> = {
  free: {
    name: 'Free',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20'
  },
  starter: {
    name: 'Starter',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  pro: {
    name: 'Pro',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  growth: {
    name: 'Growth',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  enterprise: {
    name: 'Enterprise',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20'
  }
};

const DEFAULT_PLAN_INFO = {
  name: 'Unknown',
  color: 'text-slate-400',
  bgColor: 'bg-slate-500/10',
  borderColor: 'border-slate-500/20'
};

export const CompanySettingsPage: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    company_size: '',
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    admin_can_access_billing: false
  });
  const [customScopes, setCustomScopes] = useState<string[]>([]);
  const [newScope, setNewScope] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>('');

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCompanySettings();
      setCompany(data);
      setFormData({
        name: data.name,
        website: data.website || '',
        industry: data.industry || '',
        company_size: data.company_size || '',
        primary_color: data.primary_color || '#3B82F6',
        secondary_color: data.secondary_color || '#8B5CF6',
        admin_can_access_billing: data.admin_can_access_billing || false
      });
      setCustomScopes(data.custom_scopes || []);
      setLogoPreview(data.logo_url || '');
      setFaviconPreview(data.favicon_url || '');
    } catch (error) {
      console.error('Failed to load company settings:', error);
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload logo if selected
      let logoUrl = company?.logo_url;
      if (logoFile) {
        const uploadedLogo = await apiService.uploadCompanyLogo(logoFile);
        logoUrl = uploadedLogo.url;
      }

      // Upload favicon if selected
      let faviconUrl = company?.favicon_url;
      if (faviconFile) {
        const uploadedFavicon = await apiService.uploadCompanyFavicon(faviconFile);
        faviconUrl = uploadedFavicon.url;
      }

      // Update company settings
      const updatedCompany = await apiService.updateCompanySettings({
        ...formData,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        custom_scopes: customScopes
      });

      setCompany(updatedCompany);
      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Failed to save company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Logo file size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        toast.error('Favicon file size must be less than 500KB');
        return;
      }
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addCustomScope = () => {
    if (!newScope.trim()) {
      toast.error('Scope name cannot be empty');
      return;
    }
    if (customScopes.includes(newScope.trim().toLowerCase())) {
      toast.error('Scope already exists');
      return;
    }
    setCustomScopes([...customScopes, newScope.trim().toLowerCase()]);
    setNewScope('');
    toast.success('Custom scope added');
  };

  const removeCustomScope = (scope: string) => {
    setCustomScopes(customScopes.filter(s => s !== scope));
    toast.success('Custom scope removed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-400">Failed to load company settings</p>
        </div>
      </div>
    );
  }

  // Get plan info - handle both 'plan' and 'plan_tier' field names with fallback
  const planKey = company.plan || company.plan_tier || 'free';
  const planInfo = PLAN_TIERS[planKey] || DEFAULT_PLAN_INFO;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-purple-400" />
            Company Settings
          </h1>
          <p className="text-slate-400 mt-2">
            Manage your company profile, branding, and configuration
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Company Profile & Branding */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Company Profile</h2>
            </div>

            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </div>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              {/* Industry & Company Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Industry
                    </div>
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Company Size
                    </div>
                  </label>
                  <select
                    value={formData.company_size}
                    onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Size</option>
                    {COMPANY_SIZES.map(size => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Palette className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Branding</h2>
            </div>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="h-20 w-20 rounded-lg object-cover border-2 border-slate-600"
                      />
                      <button
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview('');
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Recommended: Square image, max 2MB (PNG, JPG, SVG)
                </p>
              </div>

              {/* Favicon Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Favicon <span className="text-xs text-slate-500">(Browser Tab Icon)</span>
                </label>
                <div className="flex items-center gap-4">
                  {faviconPreview && (
                    <div className="relative">
                      <img
                        src={faviconPreview}
                        alt="Company favicon"
                        className="h-12 w-12 rounded object-cover border-2 border-slate-600"
                      />
                      <button
                        onClick={() => {
                          setFaviconFile(null);
                          setFaviconPreview('');
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}
                  <label className="cursor-pointer px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Favicon
                    <input
                      type="file"
                      accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                      onChange={handleFaviconChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Recommended: 16x16, 32x32, or 48x48 pixels, max 500KB (PNG, ICO, SVG)
                </p>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-slate-600"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="h-10 w-20 rounded-lg cursor-pointer border border-slate-600"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="p-4 rounded-lg" style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` }}>
                <p className="text-white font-medium text-center">Color Preview</p>
              </div>
            </div>
          </motion.div>

          {/* Permissions & Access Control */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Permissions & Access Control</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div>
                  <h3 className="text-white font-medium">Admin Billing Access</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Allow admins to view and manage billing and subscription settings
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.admin_can_access_billing}
                    onChange={(e) => setFormData({ ...formData, admin_can_access_billing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Custom Scopes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Tag className="h-6 w-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Custom Document Scopes</h2>
            </div>

            <div className="space-y-4">
              {/* Add Scope */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomScope()}
                  placeholder="Enter custom scope name (e.g., 'engineering', 'partnerships')"
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={addCustomScope}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Add
                </button>
              </div>

              {/* Scopes List */}
              {customScopes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customScopes.map((scope) => (
                    <motion.div
                      key={scope}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm flex items-center gap-2"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {scope}
                      <button
                        onClick={() => removeCustomScope(scope)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No custom scopes defined</p>
                  <p className="text-sm mt-1">Add custom scopes for document categorization</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Plan & Usage */}
        <div className="space-y-6">
          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Crown className="h-6 w-6 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Current Plan</h2>
            </div>

            <div className={`${planInfo.bgColor} ${planInfo.borderColor} border-2 rounded-xl p-4 mb-6`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${planInfo.color}`}>{planInfo.name}</span>
                <Crown className={`h-6 w-6 ${planInfo.color}`} />
              </div>
              <p className="text-slate-400 text-sm">
                {planKey === 'enterprise' ? 'Unlimited resources' : 'Standard plan limits apply'}
              </p>
            </div>

            {/* Plan Limits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">Max Chatbots</span>
                <span className="text-white font-semibold">
                  {company.max_bots === -1 ? '∞ Unlimited' : company.max_bots}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">Max Documents</span>
                <span className="text-white font-semibold">
                  {company.max_documents === -1 ? '∞ Unlimited' : company.max_documents}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-slate-400">Monthly Messages</span>
                <span className="text-white font-semibold">
                  {company.max_monthly_messages === -1 ? '∞ Unlimited' : company.max_monthly_messages.toLocaleString()}
                </span>
              </div>
            </div>

            {planKey !== 'enterprise' && (
              <button className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2">
                <Crown className="h-5 w-5" />
                Upgrade Plan
              </button>
            )}
          </motion.div>

          {/* Company Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Company ID</span>
                <code className="text-slate-300 bg-slate-900/50 px-2 py-1 rounded text-xs">
                  {company.id.slice(0, 8)}...
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Company Slug</span>
                <code className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded text-xs">
                  {company.slug}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Created</span>
                <span className="text-slate-300">
                  {new Date(company.created_at).toLocaleDateString()}
                </span>
              </div>
              {company.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-slate-300">
                    {new Date(company.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Success Indicator */}
          {!saving && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3"
            >
              <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-medium">Settings Loaded</p>
                <p className="text-green-300/70 text-sm mt-1">
                  Make changes and click "Save Changes" to update
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
