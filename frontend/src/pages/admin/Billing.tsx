import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Sparkles,
  Zap,
  Users,
  MessageSquare,
  FileText,
  Bot,
  RefreshCw,
  Receipt,
  Download,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Mail,
  MapPin,
  LayoutDashboard,
  BarChart3,
  Settings,
  History,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CompanyData {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string | null;
  is_personal: boolean;
  max_team_members: number;
  max_bots?: number;
  max_documents?: number;
  max_monthly_messages?: number;
}

interface UsageData {
  chatbots: { used: number; limit: number | 'Unlimited' };
  messages: { used: number; limit: number | 'Unlimited' };
  documents: { used: number; limit: number | 'Unlimited' };
  teamMembers: { used: number; limit: number | 'Unlimited' };
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}

type TabId = 'overview' | 'usage' | 'preferences' | 'history';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'usage', label: 'Account Usage', icon: BarChart3 },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'history', label: 'Payment History', icon: History },
];

// Plan limits configuration
const planLimits: Record<string, { chatbots: number | 'Unlimited'; messages: number | 'Unlimited'; documents: number | 'Unlimited'; teamMembers: number | 'Unlimited'; price: number }> = {
  free: { chatbots: 1, messages: 100, documents: 10, teamMembers: 1, price: 0 },
  pro: { chatbots: 5, messages: 10000, documents: 'Unlimited', teamMembers: 5, price: 29 },
  enterprise: { chatbots: 'Unlimited', messages: 'Unlimited', documents: 'Unlimited', teamMembers: 'Unlimited', price: 99 },
};

export const BillingPage: React.FC = () => {
  const { userInfo, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Usage data - fetched from API
  const [usage, setUsage] = useState<UsageData>({
    chatbots: { used: 0, limit: 1 },
    messages: { used: 0, limit: 100 },
    documents: { used: 0, limit: 10 },
    teamMembers: { used: 0, limit: 1 },
  });

  // Mock invoices - in real app, fetch from API
  const [invoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadCompanyData();
  }, []);

  // Helper function to check if a limit should be displayed as unlimited
  const isUnlimited = (value: number | undefined, threshold: number): boolean => {
    if (value === undefined) return false;
    return value === -1 || value >= threshold;
  };

  const loadCompanyData = async () => {
    try {
      // Fetch all data in parallel
      const [companyData, chatbotsData, usersData, analyticsData] = await Promise.all([
        apiService.getCompanySettings(),
        apiService.getChatbots(100, 0), // Get all chatbots to count them
        apiService.getUsers(),
        apiService.getAnalytics(),
      ]);

      setCompany(companyData);

      // Calculate limits based on plan type and actual database values
      // Enterprise plan always has unlimited everything
      // For other plans, treat -1 or very high numbers (999+, 9999+, 999999+) as unlimited
      const isEnterprise = companyData.plan === 'enterprise';
      const chatbotsLimit = isEnterprise || isUnlimited(companyData.max_bots, 999) ? 'Unlimited' : (companyData.max_bots || 1);
      const documentsLimit = isEnterprise || isUnlimited(companyData.max_documents, 9999) ? 'Unlimited' : (companyData.max_documents || 10);
      const messagesLimit = isEnterprise || isUnlimited(companyData.max_monthly_messages, 999999) ? 'Unlimited' : (companyData.max_monthly_messages || 100);
      const teamMembersLimit = isEnterprise || isUnlimited(companyData.max_team_members, 999) ? 'Unlimited' : (companyData.max_team_members || 1);

      // Get actual usage counts
      // Backend returns array directly, or object with chatbots array - handle both
      const chatbotsArray = Array.isArray(chatbotsData) ? chatbotsData : (chatbotsData.chatbots || []);
      const chatbotsUsed = chatbotsArray.length;
      const teamMembersUsed = Array.isArray(usersData) ? usersData.length : (usersData.users?.length || 0);
      const documentsUsed = analyticsData.knowledge_base_metrics?.total_documents || 0;
      const messagesUsed = analyticsData.conversation_metrics?.total_messages || 0;

      setUsage({
        chatbots: { used: chatbotsUsed, limit: chatbotsLimit },
        messages: { used: messagesUsed, limit: messagesLimit },
        documents: { used: documentsUsed, limit: documentsLimit },
        teamMembers: { used: teamMembersUsed, limit: teamMembersLimit },
      });
    } catch (error) {
      console.error('Failed to load company data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  // Calculate trial status
  const getTrialStatus = () => {
    if (!company?.trial_ends_at) {
      return { isActive: false, daysLeft: 0, expired: false, endDate: '' };
    }

    const trialEnd = new Date(company.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      isActive: diffDays > 0,
      daysLeft: Math.max(0, diffDays),
      expired: diffDays <= 0,
      endDate: trialEnd.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  };

  const trialStatus = getTrialStatus();
  const currentPlan = company?.plan || 'free';
  const isOnTrial = currentPlan === 'free' && trialStatus.isActive;
  const currentPlanLimits = planLimits[currentPlan] || planLimits.free;

  // Get billing cycle dates
  const getBillingCycle = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      start: startOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      end: endOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      nextBilling: nextBillingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    };
  };

  const billingCycle = getBillingCycle();

  const handleUpgrade = async (planId: string) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@githaforge.com?subject=Enterprise Plan Inquiry', '_blank');
      toast.success('Opening email to contact sales...');
      return;
    }

    setUpgrading(true);
    try {
      toast.success(`Upgrading to ${planId} plan... (Payment integration coming soon)`);
    } catch (error) {
      toast.error('Failed to initiate upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!company || deleteConfirmText !== company.name) {
      toast.error('Please type the company name correctly to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      // Call the delete company API
      await apiService.deleteCompany(company.id);
      toast.success('Account deleted successfully');
      // Log the user out and redirect to home
      logout();
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  const calculateUsagePercent = (used: number, limit: number | 'Unlimited') => {
    if (limit === 'Unlimited') return 0;
    return Math.min((used / limit) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading billing information...</span>
        </div>
      </div>
    );
  }

  // Overview Tab Content
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Upgrade Banner */}
      {showUpgradeBanner && currentPlan === 'free' && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Upgrade and grow</h3>
            <p className="text-sm text-slate-400">
              Unlock more chatbots, messages, and team members by upgrading your plan.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('preferences')}
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            View plans
          </button>
          <button
            onClick={() => setShowUpgradeBanner(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Billing Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Billing</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-colors text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Close and delete account
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm"
            >
              Change plan
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Plan */}
          <div className="flex items-start gap-8">
            <div className="w-40 text-sm text-slate-400">Current plan</div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentPlan === 'enterprise'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : currentPlan === 'pro'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
              }`}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </span>
              {isOnTrial && (
                <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                  Trial
                </span>
              )}
            </div>
          </div>

          {/* Billing Cycle */}
          <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
            <div className="w-40 text-sm text-slate-400">Billing cycle</div>
            <div>
              <p className="text-white">{billingCycle.start} to {billingCycle.end}</p>
              <p className="text-sm text-slate-400">
                Billing cycle automatically renews on {billingCycle.nextBilling} at 9:00 AM (GMT+4)
              </p>
            </div>
          </div>

          {/* Billing Information */}
          <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
            <div className="w-40 text-sm text-slate-400">Billing information</div>
            <div>
              <button
                onClick={() => toast('Payment integration coming soon!', { icon: '🚧' })}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
              >
                Update billing
              </button>
            </div>
          </div>

          {/* Monthly Total */}
          <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
            <div className="w-40 text-sm text-slate-400">Monthly total</div>
            <div>
              <p className="text-2xl font-bold text-white">${currentPlanLimits.price}.00</p>
              <p className="text-sm text-slate-400 mt-1">
                Your total is an estimate of your next monthly invoice due at the start of the next billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Overview */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Plan overview</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium">Plan value</th>
                <th className="pb-3 font-medium">Plan limits</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-700/50">
                <td className="py-4 text-purple-400">Chatbots</td>
                <td className="py-4 text-slate-300 capitalize">{currentPlan}</td>
                <td className="py-4 text-slate-400">{currentPlanLimits.chatbots} chatbots</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 text-purple-400">Messages</td>
                <td className="py-4 text-slate-300 capitalize">{currentPlan}</td>
                <td className="py-4 text-slate-400">{typeof currentPlanLimits.messages === 'number' ? `${currentPlanLimits.messages.toLocaleString()} messages/month` : 'Unlimited'}</td>
              </tr>
              <tr className="border-b border-slate-700/50">
                <td className="py-4 text-purple-400">Documents</td>
                <td className="py-4 text-slate-300 capitalize">{currentPlan}</td>
                <td className="py-4 text-slate-400">{currentPlanLimits.documents} documents</td>
              </tr>
              <tr>
                <td className="py-4 text-purple-400">Team members</td>
                <td className="py-4 text-slate-300 capitalize">{currentPlan}</td>
                <td className="py-4 text-slate-400">{currentPlanLimits.teamMembers} members</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Usage this month</h2>

        {/* Trial Banner inside usage */}
        {isOnTrial && (
          <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
            trialStatus.daysLeft <= 3
              ? 'bg-amber-500/10 border border-amber-500/30'
              : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            <Info className={`w-5 h-5 flex-shrink-0 ${trialStatus.daysLeft <= 3 ? 'text-amber-400' : 'text-blue-400'}`} />
            <p className="text-sm text-slate-300">
              {trialStatus.daysLeft <= 3
                ? `Your Pro trial expires in ${trialStatus.daysLeft} day${trialStatus.daysLeft !== 1 ? 's' : ''}. Upgrade now to keep Pro features.`
                : `You're on a 14-day Pro trial with ${trialStatus.daysLeft} days remaining. Upgrade anytime.`
              }
            </p>
            <button
              onClick={() => handleUpgrade('pro')}
              className="ml-auto px-3 py-1 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors whitespace-nowrap"
            >
              Upgrade now
            </button>
          </div>
        )}

        {/* Messages Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Messages</span>
            </div>
            <span className="text-sm text-slate-400">
              {usage.messages.used.toLocaleString()} of {typeof usage.messages.limit === 'number' ? usage.messages.limit.toLocaleString() : usage.messages.limit}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                calculateUsagePercent(usage.messages.used, usage.messages.limit) > 90
                  ? 'bg-red-500'
                  : calculateUsagePercent(usage.messages.used, usage.messages.limit) > 70
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${calculateUsagePercent(usage.messages.used, usage.messages.limit)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {Math.round(calculateUsagePercent(usage.messages.used, usage.messages.limit))}% of monthly limit used
          </p>
        </div>

        {/* Chatbots Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Active chatbots</span>
            </div>
            <span className="text-sm text-slate-400">
              {usage.chatbots.used} of {usage.chatbots.limit}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${calculateUsagePercent(usage.chatbots.used, usage.chatbots.limit)}%` }}
            />
          </div>
        </div>

        {/* Documents Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Documents</span>
            </div>
            <span className="text-sm text-slate-400">
              {usage.documents.used} of {usage.documents.limit}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: usage.documents.limit === 'Unlimited' ? 0 : `${calculateUsagePercent(usage.documents.used, usage.documents.limit)}%` }}
            />
          </div>
        </div>

        {/* Team Members Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Team members</span>
            </div>
            <span className="text-sm text-slate-400">
              {usage.teamMembers.used} of {usage.teamMembers.limit}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${calculateUsagePercent(usage.teamMembers.used, usage.teamMembers.limit)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Usage Tab Content
  const renderUsage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Account usage</h2>
          <p className="text-sm text-slate-400">Download a report of your billing history and plan usage.</p>
        </div>
        <button className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Messages Usage Chart */}
      <UsageCard
        title="Messages usage"
        icon={<MessageSquare className="w-5 h-5" />}
        data={[
          { period: 'Nov 1 - Nov 30', value: 2800 },
          { period: 'Dec 1 - Dec 31', value: 3100 },
          { period: 'Jan 1 - Jan 31', value: 3420 },
        ]}
        unit="messages"
      />

      {/* Chatbots Usage */}
      <UsageCard
        title="Chatbots created"
        icon={<Bot className="w-5 h-5" />}
        data={[
          { period: 'Nov 1 - Nov 30', value: 1 },
          { period: 'Dec 1 - Dec 31', value: 2 },
          { period: 'Jan 1 - Jan 31', value: 2 },
        ]}
        unit="chatbots"
      />

      {/* Documents Usage */}
      <UsageCard
        title="Documents uploaded"
        icon={<FileText className="w-5 h-5" />}
        data={[
          { period: 'Nov 1 - Nov 30', value: 15 },
          { period: 'Dec 1 - Dec 31', value: 28 },
          { period: 'Jan 1 - Jan 31', value: 45 },
        ]}
        unit="documents"
      />
    </div>
  );

  // Preferences Tab Content
  const renderPreferences = () => (
    <div className="space-y-6">
      {/* Compare Plans */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compare plans</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['free', 'pro', 'enterprise'] as const).map((planId) => {
            const plan = planLimits[planId];
            const isCurrent = planId === currentPlan;
            const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
            const isDowngrade = planHierarchy[planId] < planHierarchy[currentPlan];

            return (
              <div
                key={planId}
                className={`rounded-xl border p-5 ${
                  isCurrent
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-slate-700 bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white capitalize">{planId}</h3>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                      Current
                    </span>
                  )}
                </div>

                <p className="text-2xl font-bold text-white mb-4">
                  ${plan.price}<span className="text-sm font-normal text-slate-400">/mo</span>
                </p>

                <ul className="space-y-2 text-sm text-slate-400 mb-4">
                  <li>{plan.chatbots} chatbot{plan.chatbots !== 1 && typeof plan.chatbots === 'number' ? 's' : ''}</li>
                  <li>{typeof plan.messages === 'number' ? `${plan.messages.toLocaleString()} messages/mo` : 'Unlimited messages'}</li>
                  <li>{plan.documents} documents</li>
                  <li>{plan.teamMembers} team member{plan.teamMembers !== 1 && typeof plan.teamMembers === 'number' ? 's' : ''}</li>
                </ul>

                <button
                  onClick={() => !isCurrent && handleUpgrade(planId)}
                  disabled={isCurrent || upgrading}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-green-500/20 text-green-400 cursor-default'
                      : isDowngrade
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : planId === 'enterprise'
                          ? 'bg-purple-600 text-white hover:bg-purple-500'
                          : 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-500 hover:to-orange-500'
                  }`}
                >
                  {isCurrent ? 'Current plan' : isDowngrade ? `Downgrade to ${planId}` : planId === 'enterprise' ? 'Contact sales' : `Upgrade to ${planId}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Address */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Billing address</h2>
          <button
            onClick={() => toast('Billing address management coming soon!', { icon: '🚧' })}
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
          >
            Update billing address
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">Your billing address determines the applicable sales tax.</p>

        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-sm">No billing address configured</span>
        </div>
      </div>

      {/* Billing Email */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Billing email</h2>
          <button
            onClick={() => toast('Billing email management coming soon!', { icon: '🚧' })}
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
          >
            Update billing email
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">We send email notifications for billing-related updates.</p>

        <div className="flex items-center gap-2 text-slate-300">
          <Mail className="w-4 h-4 text-slate-400" />
          <span className="text-sm">{userInfo?.email || 'No email configured'}</span>
        </div>
      </div>
    </div>
  );

  // Payment History Tab Content
  const renderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Payment history</h2>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">Invoices</h3>
          <div className="flex gap-2">
            <select className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300">
              <option>All time</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
            <select className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300">
              <option>All status</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Failed</option>
            </select>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-2 border-dashed border-slate-600 rounded-lg transform rotate-6"></div>
              <div className="absolute inset-0 border-2 border-dashed border-slate-600 rounded-lg"></div>
              <Receipt className="w-8 h-8 text-slate-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-white font-medium mb-1">No invoices yet</h3>
            <p className="text-sm text-slate-400">
              Your invoices will appear here once you upgrade to a paid plan.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-700/50">
                  <td className="py-3 text-sm text-slate-300">{invoice.date}</td>
                  <td className="py-3 text-sm text-slate-300">${invoice.amount.toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      invoice.status === 'paid'
                        ? 'bg-green-500/20 text-green-400'
                        : invoice.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {invoice.downloadUrl && (
                      <button className="text-purple-400 hover:text-purple-300 text-sm">
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'usage':
        return renderUsage();
      case 'preferences':
        return renderPreferences();
      case 'history':
        return renderHistory();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-purple-400" />
          Billing & Plans
        </h1>
        <p className="text-slate-400 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Tab Navigation - Matching Chatbots page style */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 inline-flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Account</h3>
                  <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-300">
                  <strong>Warning:</strong> This will permanently delete your account and all associated data including:
                </p>
                <ul className="text-sm text-red-300/80 mt-2 ml-4 list-disc space-y-1">
                  <li>All chatbots and their configurations</li>
                  <li>All documents and knowledge base data</li>
                  <li>All conversation history</li>
                  <li>All team member access</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  To confirm, type <span className="font-semibold text-white">"{company?.name}"</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type company name to confirm"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== company?.name || isDeleting}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  deleteConfirmText === company?.name && !isDeleting
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Usage Card Component
const UsageCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  data: Array<{ period: string; value: number }>;
  unit: string;
}> = ({ title, icon, data, unit }) => {
  const [expanded, setExpanded] = useState(true);
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          <span className="font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0">
          <div className="flex items-center gap-4 mb-4">
            <select className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300">
              <option>Last 3 monthly cycles</option>
              <option>Last 6 monthly cycles</option>
              <option>Last 12 monthly cycles</option>
            </select>
          </div>

          <p className="text-sm text-slate-400 mb-3">{title} per monthly cycle</p>

          {/* Horizontal bar chart */}
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-28 flex-shrink-0">{item.period}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-16 text-right">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
