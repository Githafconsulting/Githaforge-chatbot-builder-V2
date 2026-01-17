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
  Plus,
  Shield,
  Clock,
  XCircle,
  ExternalLink,
  Eye,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
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
  billing_email?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_address_city?: string;
  billing_address_state?: string;
  billing_address_postal_code?: string;
  billing_address_country?: string;
  subscription_current_period_start?: string;
  subscription_current_period_end?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  // Scheduled plan change (for end-of-cycle downgrades)
  pending_plan?: string | null;
  pending_plan_effective_date?: string | null;
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
  time: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
  previewUrl?: string;
  isArchived?: boolean;
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
  free: { chatbots: 1, messages: 1000, documents: 1, teamMembers: 1, price: 0 },
  starter: { chatbots: 2, messages: 5000, documents: 3, teamMembers: 2, price: 30 },
  pro: { chatbots: 5, messages: 15000, documents: 5, teamMembers: 5, price: 50 },
  enterprise: { chatbots: 15, messages: 50000, documents: 10, teamMembers: 15, price: 100 },
};

// Plan hierarchy for upgrade/downgrade detection
const planHierarchy: Record<string, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };

// Get gradient color based on usage percentage (smooth transition from blue → green → yellow → orange → red)
const getUsageColor = (percent: number): string => {
  // Clamp percent between 0 and 100
  const p = Math.min(Math.max(percent, 0), 100);

  // Define color stops: blue (0%) → green (25%) → yellow (50%) → orange (75%) → red (100%)
  // Each color is defined as [r, g, b]
  const colors: [number, number, number][] = [
    [59, 130, 246],   // blue-500 at 0%
    [34, 197, 94],    // green-500 at 25%
    [234, 179, 8],    // yellow-500 at 50%
    [249, 115, 22],   // orange-500 at 75%
    [239, 68, 68],    // red-500 at 100%
  ];

  // Calculate which segment we're in and the position within that segment
  const segment = p / 25; // 0-4 range
  const segmentIndex = Math.min(Math.floor(segment), 3); // 0-3
  const segmentProgress = segment - segmentIndex; // 0-1 within segment

  // Interpolate between the two colors
  const color1 = colors[segmentIndex];
  const color2 = colors[segmentIndex + 1];

  const r = Math.round(color1[0] + (color2[0] - color1[0]) * segmentProgress);
  const g = Math.round(color1[1] + (color2[1] - color1[1]) * segmentProgress);
  const b = Math.round(color1[2] + (color2[2] - color1[2]) * segmentProgress);

  return `rgb(${r}, ${g}, ${b})`;
};

export const BillingPage: React.FC = () => {
  const { userInfo, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(true);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Cancel/Downgrade modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelImmediately, setCancelImmediately] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  // Plan change modal state (for upgrades/downgrades between paid plans)
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'starter' | 'pro' | 'enterprise' | null>(null);
  const [planChangeOption, setPlanChangeOption] = useState<'credit' | 'refund'>('credit');
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isLoadingProration, setIsLoadingProration] = useState(false);
  const [prorationData, setProrationData] = useState<{
    credit_dollars: number;
    charge_dollars: number;
    net_dollars: number;
    is_downgrade: boolean;
    existing_credit_dollars?: number;
    this_change_net_dollars?: number;
  } | null>(null);

  // Cancel scheduled downgrade state
  const [isCancelingScheduledDowngrade, setIsCancelingScheduledDowngrade] = useState(false);

  // Usage data - fetched from API
  const [usage, setUsage] = useState<UsageData>({
    chatbots: { used: 0, limit: 1 },
    messages: { used: 0, limit: 100 },
    documents: { used: 0, limit: 1 },
    teamMembers: { used: 0, limit: 1 },
  });

  // Invoices from API
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Invoice filters
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<'all' | '30days' | '90days' | 'thisYear'>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [invoiceArchiveFilter, setInvoiceArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Bulk selection state
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Account credit balance from Stripe
  const [accountCredit, setAccountCredit] = useState<{
    credit_balance: number;
    credit_balance_dollars: number;
    currency: string;
    has_credit: boolean;
  } | null>(null);

  // Check for payment success/cancel from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast.success('Payment successful! Your subscription is now active.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (canceled === 'true') {
      toast('Payment was canceled.', { icon: '❌' });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    loadCompanyData();
    loadInvoices();
    loadAccountCredit();
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
      const currentPlanConfig = planLimits[companyData.plan] || planLimits.free;
      const chatbotsLimit = isEnterprise || isUnlimited(companyData.max_bots, 999) ? 'Unlimited' : (companyData.max_bots || currentPlanConfig.chatbots);
      const documentsLimit = isEnterprise || isUnlimited(companyData.max_documents, 9999) ? 'Unlimited' : (companyData.max_documents || currentPlanConfig.documents);
      const messagesLimit = isEnterprise || isUnlimited(companyData.max_monthly_messages, 999999) ? 'Unlimited' : (companyData.max_monthly_messages || currentPlanConfig.messages);
      const teamMembersLimit = isEnterprise || isUnlimited(companyData.max_team_members, 999) ? 'Unlimited' : (companyData.max_team_members || currentPlanConfig.teamMembers);

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

  const loadInvoices = async () => {
    try {
      const invoiceData = await apiService.getInvoices();
      // Transform to our Invoice format
      setInvoices(invoiceData.map(inv => {
        const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : null;
        return {
          id: inv.id,
          date: invoiceDate ? invoiceDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }) : 'N/A',
          time: invoiceDate ? invoiceDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }) : '',
          amount: inv.amount_paid / 100, // Convert from cents
          status: inv.status === 'paid' ? 'paid' : inv.status === 'open' ? 'pending' : 'failed',
          downloadUrl: inv.invoice_pdf_url || undefined,
          previewUrl: inv.hosted_invoice_url || undefined,
          isArchived: inv.is_archived || false,
        };
      }));
    } catch (error) {
      console.error('Failed to load invoices:', error);
      // Don't show error toast - invoices are not critical
    }
  };

  const loadAccountCredit = async () => {
    try {
      const creditData = await apiService.getAccountCredit();
      setAccountCredit(creditData);
    } catch (error) {
      console.error('Failed to load account credit:', error);
      // Don't show error toast - credit info is not critical
    }
  };

  // Open Stripe Customer Portal to manage payment methods
  const handleManagePayments = async () => {
    try {
      const { portal_url } = await apiService.createPortalSession();
      window.location.href = portal_url;
    } catch (error: any) {
      console.error('Failed to open billing portal:', error);
      toast.error(error.response?.data?.detail || 'Failed to open billing portal. Please try again.');
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

  // Get billing cycle dates from subscription or fallback to calendar month
  const getBillingCycle = () => {
    // Use actual subscription period if available
    if (company?.subscription_current_period_start && company?.subscription_current_period_end) {
      const periodStart = new Date(company.subscription_current_period_start);
      const periodEnd = new Date(company.subscription_current_period_end);

      // Next billing happens exactly at period_end (that's when Stripe charges)
      // Format the time in a user-friendly way
      const nextBillingTime = periodEnd.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return {
        start: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        end: periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        nextBilling: periodEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        nextBillingTime: nextBillingTime,
      };
    }

    // Fallback to calendar month for free plans (no actual billing)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      start: startOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      end: endOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      nextBilling: nextBillingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      nextBillingTime: null, // Free plans don't have actual billing time
    };
  };

  const billingCycle = getBillingCycle();

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      // Downgrade to free - show cancel subscription modal
      setShowCancelModal(true);
      return;
    }

    if (planId !== 'starter' && planId !== 'pro' && planId !== 'enterprise') {
      toast.error('Invalid plan selected');
      return;
    }

    // Check if user has an active subscription
    const hasActiveSubscription = company?.stripe_subscription_id &&
      company?.subscription_status === 'active';

    if (hasActiveSubscription) {
      // Show plan change modal
      setTargetPlan(planId as 'starter' | 'pro' | 'enterprise');
      setPlanChangeOption('credit');
      setShowPlanChangeModal(true);
      setProrationData(null);

      // Check if this is a downgrade or upgrade
      const isDowngrade = planHierarchy[planId] < planHierarchy[currentPlan];

      if (isDowngrade) {
        // Downgrades are scheduled for end-of-cycle, no proration needed
        // Just set is_downgrade flag for the UI
        setIsLoadingProration(false);
        setProrationData({
          credit_dollars: 0,
          charge_dollars: 0,
          net_dollars: 0,
          is_downgrade: true,
          existing_credit_dollars: 0,
          this_change_net_dollars: 0
        });
      } else {
        // Upgrades: fetch proration from Stripe
        setIsLoadingProration(true);
        try {
          const proration = await apiService.getProrationPreview(planId as 'starter' | 'pro' | 'enterprise');
          setProrationData({
            credit_dollars: proration.credit_dollars,
            charge_dollars: proration.charge_dollars,
            net_dollars: proration.net_dollars,
            is_downgrade: proration.is_downgrade,
            existing_credit_dollars: proration.existing_credit_dollars,
            this_change_net_dollars: proration.this_change_net_dollars
          });
        } catch (error: any) {
          console.error('Failed to get proration preview:', error);
          // Modal will show fallback estimate
        } finally {
          setIsLoadingProration(false);
        }
      }
    } else {
      // New subscription - go through Stripe checkout
      setUpgradingPlan(planId);
      try {
        const { checkout_url } = await apiService.createCheckoutSession(planId as 'starter' | 'pro' | 'enterprise');
        window.location.href = checkout_url;
      } catch (error: any) {
        console.error('Failed to create checkout session:', error);
        toast.error(error.response?.data?.detail || 'Failed to initiate upgrade. Please try again.');
        setUpgradingPlan(null);
      }
    }
  };

  // Handle confirmed plan change from modal
  const handleConfirmPlanChange = async () => {
    if (!targetPlan) return;

    setIsChangingPlan(true);
    try {
      const response = await apiService.updateSubscription(targetPlan);
      setShowPlanChangeModal(false);
      setTargetPlan(null);
      // Show success message with plan details
      const isUpgrade = planLimits[targetPlan].price > planLimits[currentPlan].price;
      toast.success(
        isUpgrade
          ? `Successfully upgraded to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}! Your card has been charged.`
          : `Successfully changed to ${targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}!`,
        { duration: 4000 }
      );
      // Delay reload to show toast message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Failed to change plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to change plan. Please try again.');
    } finally {
      setIsChangingPlan(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const response = await apiService.cancelSubscription(cancelImmediately, cancelFeedback || undefined);

      toast.success(response.message);

      // Refresh company data to show updated plan
      await loadCompanyData();

      // Close modal and reset state
      setShowCancelModal(false);
      setCancelImmediately(false);
      setCancelFeedback('');
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel subscription. Please try again.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCancelScheduledDowngrade = async () => {
    setIsCancelingScheduledDowngrade(true);
    try {
      const response = await apiService.cancelScheduledDowngrade();
      toast.success(response.message);
      // Refresh company data to clear pending plan
      await loadCompanyData();
    } catch (error: any) {
      console.error('Failed to cancel scheduled downgrade:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel scheduled downgrade. Please try again.');
    } finally {
      setIsCancelingScheduledDowngrade(false);
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

  // Filter invoices based on selected filters
  const getFilteredInvoices = () => {
    return invoices.filter(invoice => {
      // Archive filter
      if (invoiceArchiveFilter === 'active' && invoice.isArchived) {
        return false;
      }
      if (invoiceArchiveFilter === 'archived' && !invoice.isArchived) {
        return false;
      }

      // Status filter
      if (invoiceStatusFilter !== 'all' && invoice.status !== invoiceStatusFilter) {
        return false;
      }

      // Date filter - need to parse the date string back to Date object
      if (invoiceDateFilter !== 'all') {
        const invoiceDate = new Date(invoice.date);
        const now = new Date();

        switch (invoiceDateFilter) {
          case '30days': {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (invoiceDate < thirtyDaysAgo) return false;
            break;
          }
          case '90days': {
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (invoiceDate < ninetyDaysAgo) return false;
            break;
          }
          case 'thisYear': {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            if (invoiceDate < startOfYear) return false;
            break;
          }
        }
      }

      return true;
    });
  };

  const filteredInvoices = getFilteredInvoices();

  // Bulk actions handlers
  const handleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleArchiveInvoice = async (invoiceId: string) => {
    try {
      setIsArchiving(true);
      await apiService.archiveInvoice(invoiceId);
      // Update local state
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId ? { ...inv, isArchived: true } : inv
      ));
      toast.success('Invoice archived');
    } catch (error) {
      console.error('Error archiving invoice:', error);
      toast.error('Failed to archive invoice');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchiveInvoice = async (invoiceId: string) => {
    try {
      setIsArchiving(true);
      await apiService.unarchiveInvoice(invoiceId);
      // Update local state
      setInvoices(prev => prev.map(inv =>
        inv.id === invoiceId ? { ...inv, isArchived: false } : inv
      ));
      toast.success('Invoice unarchived');
    } catch (error) {
      console.error('Error unarchiving invoice:', error);
      toast.error('Failed to unarchive invoice');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedInvoices.size === 0) return;
    try {
      setIsArchiving(true);
      const invoiceIds = Array.from(selectedInvoices);
      const result = await apiService.bulkArchiveInvoices(invoiceIds);
      // Update local state
      setInvoices(prev => prev.map(inv =>
        selectedInvoices.has(inv.id) ? { ...inv, isArchived: true } : inv
      ));
      setSelectedInvoices(new Set());
      setIsBulkMode(false);
      toast.success(`Archived ${result.details.archived_count} invoices`);
    } catch (error) {
      console.error('Error bulk archiving invoices:', error);
      toast.error('Failed to archive invoices');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedInvoices.size === 0) return;
    try {
      setIsArchiving(true);
      const invoiceIds = Array.from(selectedInvoices);
      const result = await apiService.bulkUnarchiveInvoices(invoiceIds);
      // Update local state
      setInvoices(prev => prev.map(inv =>
        selectedInvoices.has(inv.id) ? { ...inv, isArchived: false } : inv
      ));
      setSelectedInvoices(new Set());
      setIsBulkMode(false);
      toast.success(`Unarchived ${result.details.unarchived_count} invoices`);
    } catch (error) {
      console.error('Error bulk unarchiving invoices:', error);
      toast.error('Failed to unarchive invoices');
    } finally {
      setIsArchiving(false);
    }
  };

  const exitBulkMode = () => {
    setIsBulkMode(false);
    setSelectedInvoices(new Set());
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

          {/* Pending Downgrade Banner */}
          {company?.pending_plan && company?.pending_plan_effective_date && (
            <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
              <div className="w-40 text-sm text-slate-400">Scheduled change</div>
              <div className="flex-1">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-300 font-medium">
                          Downgrade scheduled to {company.pending_plan.charAt(0).toUpperCase() + company.pending_plan.slice(1)}
                        </p>
                        <p className="text-sm text-amber-300/80 mt-1">
                          Your plan will change on{' '}
                          {new Date(company.pending_plan_effective_date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          . You'll continue to have full access to your current plan features until then.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelScheduledDowngrade}
                      disabled={isCancelingScheduledDowngrade}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors flex-shrink-0"
                    >
                      {isCancelingScheduledDowngrade ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Cancel change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Cycle */}
          <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
            <div className="w-40 text-sm text-slate-400">Billing cycle</div>
            <div>
              <p className="text-white">{billingCycle.start} to {billingCycle.end}</p>
              <p className="text-sm text-slate-400">
                {billingCycle.nextBillingTime
                  ? `Billing cycle automatically renews on ${billingCycle.nextBilling} at ${billingCycle.nextBillingTime}`
                  : `Usage resets on ${billingCycle.nextBilling}`
                }
              </p>
            </div>
          </div>

          {/* Billing Information */}
          <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
            <div className="w-40 text-sm text-slate-400">Billing information</div>
            <div>
              <button
                onClick={() => setActiveTab('preferences')}
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

          {/* Account Credit */}
          {accountCredit && accountCredit.has_credit && accountCredit.credit_balance_dollars >= 1.00 && (
            <div className="flex items-start gap-8 border-t border-slate-700/50 pt-6">
              <div className="w-40 text-sm text-slate-400">Account credit</div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-green-400">${accountCredit.credit_balance_dollars.toFixed(2)}</p>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                    Credit
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  This credit will be automatically applied to your next invoice, reducing your payment.
                </p>
              </div>
            </div>
          )}
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
              className="h-full rounded-full transition-all"
              style={{
                width: `${calculateUsagePercent(usage.messages.used, usage.messages.limit)}%`,
                backgroundColor: getUsageColor(calculateUsagePercent(usage.messages.used, usage.messages.limit))
              }}
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
              className="h-full rounded-full transition-all"
              style={{
                width: `${calculateUsagePercent(usage.chatbots.used, usage.chatbots.limit)}%`,
                backgroundColor: getUsageColor(calculateUsagePercent(usage.chatbots.used, usage.chatbots.limit))
              }}
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
              className="h-full rounded-full transition-all"
              style={{
                width: `${calculateUsagePercent(usage.documents.used, usage.documents.limit)}%`,
                backgroundColor: getUsageColor(calculateUsagePercent(usage.documents.used, usage.documents.limit))
              }}
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
              className="h-full rounded-full transition-all"
              style={{
                width: `${calculateUsagePercent(usage.teamMembers.used, usage.teamMembers.limit)}%`,
                backgroundColor: getUsageColor(calculateUsagePercent(usage.teamMembers.used, usage.teamMembers.limit))
              }}
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

  // Accepted payment methods - these are what users can actually pay with (Stripe processes them)
  // All payment method logos use white background for consistent appearance
  const paymentMethods: Array<{ name: string; logo: string }> = [
    { name: 'Visa', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
    { name: 'Mastercard', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' },
    { name: 'American Express', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg' },
    { name: 'Discover', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg' },
    { name: 'Apple Pay', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg' },
    { name: 'Google Pay', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg' },
  ];

  // Preferences Tab Content
  const renderPreferences = () => (
    <div className="space-y-6">
      {/* Payment Methods Card */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Payment Methods
            </h2>
            <p className="text-sm text-slate-400 mt-1">Manage your payment methods for subscriptions</p>
          </div>
          <button
            onClick={handleManagePayments}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Manage payment methods
          </button>
        </div>

        {/* No payment methods message */}
        <div className="bg-slate-900/50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 text-slate-400">
            <CreditCard className="w-8 h-8" />
            <div>
              <p className="text-white font-medium">No payment methods added</p>
              <p className="text-sm">Add a payment method to upgrade your plan or enable automatic billing.</p>
            </div>
          </div>
        </div>

        {/* Supported Payment Methods */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Supported payment methods</h3>
          <div className="flex flex-wrap items-center gap-3">
            {paymentMethods.map((method) => (
              <div
                key={method.name}
                className="rounded-lg px-4 py-3 flex items-center justify-center hover:opacity-80 transition-all min-w-[100px] h-12 bg-white"
                title={method.name}
              >
                <img
                  src={method.logo}
                  alt={method.name}
                  className="h-6 w-auto max-w-[80px] object-contain"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `<span class="text-slate-300 text-sm font-medium">${method.name}</span>`;
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice with Powered by Stripe */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-green-300 font-medium">Secure Payment Processing</p>
            <p className="text-xs text-green-400/80 mt-1">
              Your payment information is encrypted and never stored on our servers. All transactions are PCI-DSS compliant.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md">
            <span className="text-xs text-slate-400 font-medium">Powered by</span>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
              alt="Stripe"
              className="h-5 w-auto"
            />
          </div>
        </div>
      </div>

      {/* Account Credit */}
      {accountCredit && accountCredit.has_credit && accountCredit.credit_balance_dollars >= 1.00 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account credit</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-green-400">${accountCredit.credit_balance_dollars.toFixed(2)}</p>
                <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
                  Credit
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                This credit will be automatically applied to your next invoice, reducing your payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compare Plans */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compare plans</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['free', 'starter', 'pro', 'enterprise'] as const).map((planId) => {
            const plan = planLimits[planId];
            const isCurrent = planId === currentPlan;
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
                  <li>{plan.documents} document{plan.documents !== 1 && typeof plan.documents === 'number' ? 's' : ''}</li>
                  <li>{plan.teamMembers} team member{plan.teamMembers !== 1 && typeof plan.teamMembers === 'number' ? 's' : ''}</li>
                </ul>

                <button
                  onClick={() => !isCurrent && !upgradingPlan && handleUpgrade(planId)}
                  disabled={isCurrent || !!upgradingPlan}
                  className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-green-500/20 text-green-400 cursor-default'
                      : isDowngrade
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : planId === 'enterprise'
                          ? 'bg-purple-600 text-white hover:bg-purple-500'
                          : planId === 'pro'
                            ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-500 hover:to-orange-500'
                            : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {upgradingPlan === planId ? 'Processing...' : isCurrent ? 'Current plan' : isDowngrade ? `Downgrade to ${planId}` : `Upgrade to ${planId}`}
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
            onClick={handleManagePayments}
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
          >
            Update billing address
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">Your billing address determines the applicable sales tax.</p>

        <div className="flex items-start gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          {company?.billing_address_line1 ? (
            <div className="text-sm space-y-0.5">
              <p>{company.billing_address_line1}</p>
              {company.billing_address_line2 && <p>{company.billing_address_line2}</p>}
              <p>
                {[
                  company.billing_address_city,
                  company.billing_address_state,
                  company.billing_address_postal_code
                ].filter(Boolean).join(', ')}
              </p>
              {company.billing_address_country && (
                <p className="text-slate-400">{company.billing_address_country}</p>
              )}
            </div>
          ) : (
            <span className="text-sm">No billing address configured</span>
          )}
        </div>
      </div>

      {/* Billing Email */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Billing email</h2>
          <button
            onClick={handleManagePayments}
            className="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
          >
            Update billing email
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">We send email notifications for billing-related updates.</p>

        <div className="flex items-center gap-2 text-slate-300">
          <Mail className="w-4 h-4 text-slate-400" />
          <span className="text-sm">{company?.billing_email || userInfo?.email || 'No email configured'}</span>
        </div>
      </div>
    </div>
  );

  // Payment History Tab Content
  const renderHistory = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Payment history</h2>
        {!isBulkMode && filteredInvoices.length > 0 && (
          <button
            onClick={() => setIsBulkMode(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
          >
            <CheckSquare className="w-4 h-4" />
            Bulk edit
          </button>
        )}
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        {/* Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="font-medium text-white">Invoices</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={invoiceArchiveFilter}
              onChange={(e) => setInvoiceArchiveFilter(e.target.value as typeof invoiceArchiveFilter)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            <select
              value={invoiceDateFilter}
              onChange={(e) => setInvoiceDateFilter(e.target.value as typeof invoiceDateFilter)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300"
            >
              <option value="all">All time</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="thisYear">This year</option>
            </select>
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value as typeof invoiceStatusFilter)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300"
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {isBulkMode && (
          <div className="flex items-center justify-between p-3 mb-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                {selectedInvoices.size === filteredInvoices.length ? (
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedInvoices.size === filteredInvoices.length ? 'Deselect all' : 'Select all'}
              </button>
              {selectedInvoices.size > 0 && (
                <span className="text-sm text-slate-400">
                  {selectedInvoices.size} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedInvoices.size > 0 && (
                <>
                  {invoiceArchiveFilter === 'archived' ? (
                    <button
                      onClick={handleBulkUnarchive}
                      disabled={isArchiving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm disabled:opacity-50"
                    >
                      {isArchiving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArchiveRestore className="w-4 h-4" />
                      )}
                      Unarchive
                    </button>
                  ) : (
                    <button
                      onClick={handleBulkArchive}
                      disabled={isArchiving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors text-sm disabled:opacity-50"
                    >
                      {isArchiving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                      Archive
                    </button>
                  )}
                </>
              )}
              <button
                onClick={exitBulkMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <div className="absolute inset-0 border-2 border-dashed border-slate-600 rounded-lg transform rotate-6"></div>
              <div className="absolute inset-0 border-2 border-dashed border-slate-600 rounded-lg"></div>
              {invoiceArchiveFilter === 'archived' ? (
                <Archive className="w-8 h-8 text-slate-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              ) : (
                <Receipt className="w-8 h-8 text-slate-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            {invoices.length === 0 ? (
              <>
                <h3 className="text-white font-medium mb-1">No invoices yet</h3>
                <p className="text-sm text-slate-400">
                  Your invoices will appear here once you upgrade to a paid plan.
                </p>
              </>
            ) : invoiceArchiveFilter === 'archived' ? (
              <>
                <h3 className="text-white font-medium mb-1">No archived invoices</h3>
                <p className="text-sm text-slate-400">
                  Archived invoices will appear here. You can archive invoices to declutter your view.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-white font-medium mb-1">No matching invoices</h3>
                <p className="text-sm text-slate-400">
                  No invoices match your current filters. Try adjusting the date range or status filter.
                </p>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                {isBulkMode && <th className="pb-3 font-medium w-10"></th>}
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Time</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors ${
                    selectedInvoices.has(invoice.id) ? 'bg-purple-500/10' : ''
                  }`}
                >
                  {isBulkMode && (
                    <td className="py-3">
                      <button
                        onClick={() => handleSelectInvoice(invoice.id)}
                        className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                      >
                        {selectedInvoices.has(invoice.id) ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="py-3 text-sm text-slate-300">{invoice.date}</td>
                  <td className="py-3 text-sm text-slate-500">{invoice.time || '-'}</td>
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
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      {invoice.previewUrl && (
                        <a
                          href={invoice.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          title="View invoice"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </a>
                      )}
                      {invoice.downloadUrl && (
                        <a
                          href={invoice.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </a>
                      )}
                      {!isBulkMode && (
                        invoice.isArchived ? (
                          <button
                            onClick={() => handleUnarchiveInvoice(invoice.id)}
                            disabled={isArchiving}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50"
                            title="Unarchive"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                            <span className="hidden sm:inline">Unarchive</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveInvoice(invoice.id)}
                            disabled={isArchiving}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-50"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                            <span className="hidden sm:inline">Archive</span>
                          </button>
                        )
                      )}
                      {!invoice.previewUrl && !invoice.downloadUrl && !isBulkMode && !invoice.isArchived && (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </div>
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
    <div className="flex flex-col h-full">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 space-y-6 pb-4">
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
      </div>

      {/* Scrollable Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </div>

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

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-lg w-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cancel Subscription</h3>
                  <p className="text-sm text-slate-400">Downgrade to the Free plan</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-amber-300">
                  <strong>What you'll lose:</strong>
                </p>
                <ul className="text-sm text-amber-300/80 mt-2 ml-4 list-disc space-y-1">
                  <li>Access to additional chatbots beyond the free limit</li>
                  <li>Extra message quota and documents</li>
                  <li>Team member seats beyond the free limit</li>
                  <li>Priority support and advanced features</li>
                </ul>
              </div>

              {/* Cancellation Options */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">When should this take effect?</label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-600 hover:border-slate-500 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="cancelOption"
                    checked={!cancelImmediately}
                    onChange={() => setCancelImmediately(false)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-white font-medium">At end of billing period</p>
                    <p className="text-sm text-slate-400">
                      Keep your current plan features until {billingCycle.end}. No refund needed.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-600 hover:border-slate-500 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="cancelOption"
                    checked={cancelImmediately}
                    onChange={() => setCancelImmediately(true)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-white font-medium">Cancel immediately</p>
                    <p className="text-sm text-slate-400">
                      Downgrade now and receive a pro-rated refund for unused time.
                    </p>
                  </div>
                </label>
              </div>

              {/* Optional Feedback */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Why are you canceling? (optional)
                </label>
                <textarea
                  value={cancelFeedback}
                  onChange={(e) => setCancelFeedback(e.target.value)}
                  placeholder="Help us improve by sharing your feedback..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelImmediately(false);
                  setCancelFeedback('');
                }}
                disabled={isCanceling}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Keep my plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors flex items-center gap-2"
              >
                {isCanceling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  <>
                    {cancelImmediately ? 'Cancel & get refund' : 'Cancel at period end'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Plan Change Confirmation Modal */}
      {showPlanChangeModal && targetPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-lg w-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  planLimits[targetPlan].price < planLimits[currentPlan].price
                    ? 'bg-amber-500/20'
                    : 'bg-purple-500/20'
                }`}>
                  {planLimits[targetPlan].price < planLimits[currentPlan].price ? (
                    <ChevronDown className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {planLimits[targetPlan].price < planLimits[currentPlan].price ? 'Downgrade' : 'Upgrade'} to {targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)}
                  </h3>
                  <p className="text-sm text-slate-400">
                    ${planLimits[currentPlan].price}/mo → ${planLimits[targetPlan].price}/mo
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Plan Change Explanation */}
              <div className={`rounded-lg p-4 ${
                planLimits[targetPlan].price < planLimits[currentPlan].price
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-purple-500/10 border border-purple-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {planLimits[targetPlan].price < planLimits[currentPlan].price ? (
                    <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                  ) : (
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-400" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      planLimits[targetPlan].price < planLimits[currentPlan].price
                        ? 'text-amber-300'
                        : 'text-purple-300'
                    }`}>
                      {planLimits[targetPlan].price < planLimits[currentPlan].price
                        ? 'Scheduled for end of billing cycle'
                        : 'Immediate upgrade with proration'
                      }
                    </p>
                    <p className={`text-sm mt-1 ${
                      planLimits[targetPlan].price < planLimits[currentPlan].price
                        ? 'text-amber-300/80'
                        : 'text-purple-300/80'
                    }`}>
                      {planLimits[targetPlan].price < planLimits[currentPlan].price ? (
                        <>
                          Your downgrade will take effect at the end of your current billing period on{' '}
                          <strong>{billingCycle.end}</strong>. You'll continue to have full access to your{' '}
                          {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan features until then.
                          No refunds or credits are issued for downgrades.
                        </>
                      ) : (
                        <>
                          You'll be charged the prorated difference for the remaining time in your billing cycle.
                          Your new plan starts immediately.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Proration Amount Display */}
              <div className="bg-slate-900/50 rounded-lg p-4">
                {isLoadingProration ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-sm text-slate-400">Loading plan details...</span>
                  </div>
                ) : prorationData ? (
                  // Show real data from Stripe
                  <>
                    {prorationData.is_downgrade ? (
                      // Downgrade: Show scheduled change info (no credit/refund issued)
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Current plan until {billingCycle.end}</span>
                          <span className="text-sm text-white">
                            {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} (${planLimits[currentPlan].price}/mo)
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-slate-400 text-sm">New plan starting next cycle</span>
                          <span className="text-lg font-semibold text-white">
                            {targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} (${planLimits[targetPlan].price}/mo)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          You've already paid for your current billing period. Your {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} features remain active until {billingCycle.end}.
                        </p>
                      </>
                    ) : (
                      // Upgrade: show breakdown
                      <>
                        {/* Upgrade cost breakdown */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Upgrade cost (prorated)</span>
                            <span>${(prorationData.this_change_net_dollars ?? prorationData.charge_dollars - prorationData.credit_dollars).toFixed(2)}</span>
                          </div>
                          {(prorationData.existing_credit_dollars ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-green-400">
                              <span>Your account credit</span>
                              <span>-${prorationData.existing_credit_dollars?.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                            <span className="text-slate-300 font-medium">Amount due now</span>
                            <span className={`text-lg font-semibold ${prorationData.net_dollars <= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                              {prorationData.net_dollars <= 0
                                ? '$0.00'
                                : `$${prorationData.net_dollars.toFixed(2)}`
                              }
                            </span>
                          </div>
                        </div>
                        {prorationData.net_dollars < 0 && (
                          <p className="text-xs text-green-400 mt-2">
                            You have ${Math.abs(prorationData.net_dollars).toFixed(2)} remaining credit after this upgrade.
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  // Fallback if Stripe API failed
                  <>
                    {planLimits[targetPlan].price < planLimits[currentPlan].price ? (
                      // Downgrade fallback
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Current plan until {billingCycle.end}</span>
                          <span className="text-sm text-white">
                            {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} (${planLimits[currentPlan].price}/mo)
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-slate-400 text-sm">New plan starting next cycle</span>
                          <span className="text-lg font-semibold text-white">
                            {targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1)} (${planLimits[targetPlan].price}/mo)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Change takes effect at end of billing cycle.
                        </p>
                      </>
                    ) : (
                      // Upgrade fallback
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">New monthly price</span>
                          <span className="text-lg font-semibold text-white">
                            ${planLimits[targetPlan].price}.00/mo
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          You'll be charged the prorated difference today.
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* What changes */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">
                  {planLimits[targetPlan].price < planLimits[currentPlan].price ? "What you'll have after downgrading:" : "What you'll get:"}
                </p>
                <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
                  <li>{planLimits[targetPlan].chatbots} chatbot{typeof planLimits[targetPlan].chatbots === 'number' && planLimits[targetPlan].chatbots !== 1 ? 's' : ''}</li>
                  <li>{typeof planLimits[targetPlan].messages === 'number' ? `${planLimits[targetPlan].messages.toLocaleString()} messages/month` : 'Unlimited messages'}</li>
                  <li>{planLimits[targetPlan].documents} documents</li>
                  <li>{planLimits[targetPlan].teamMembers} team member{typeof planLimits[targetPlan].teamMembers === 'number' && planLimits[targetPlan].teamMembers !== 1 ? 's' : ''}</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPlanChangeModal(false);
                  setTargetPlan(null);
                }}
                disabled={isChangingPlan}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPlanChange}
                disabled={isChangingPlan}
                className={`px-4 py-2 rounded-lg text-white transition-colors flex items-center gap-2 ${
                  planLimits[targetPlan].price < planLimits[currentPlan].price
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                {isChangingPlan ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {planLimits[targetPlan].price < planLimits[currentPlan].price ? 'Scheduling...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {planLimits[targetPlan].price < planLimits[currentPlan].price ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Schedule downgrade
                      </>
                    ) : (
                      'Confirm upgrade'
                    )}
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
            {data.map((item, index) => {
              const percent = (item.value / maxValue) * 100;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 flex-shrink-0">{item.period}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: getUsageColor(percent)
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right">{item.value.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
