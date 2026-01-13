import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  FileText,
  MessageSquare,
  Flag,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Settings,
  Trash2,
  Brain,
  Bot,
  Cloud,
  ImageIcon,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { slideInLeft } from '../../utils/animations';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSelector } from '../LanguageSelector';

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const { logout, userInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [adminCanAccessBilling, setAdminCanAccessBilling] = useState(false);

  // Company name is now fetched in AuthContext during login
  const companyName = userInfo?.companyName || 'Workspace';
  const userRole = userInfo?.role || 'member';

  // Get first name from full name
  const firstName = userInfo?.fullName?.split(' ')[0] || 'User';
  const firstInitial = firstName[0]?.toUpperCase() || 'U';

  // Placeholder favicon - matches the ImageIcon placeholder used for logo
  // This is a simple image/picture icon similar to Lucide's ImageIcon
  const PLACEHOLDER_FAVICON = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="%231e293b"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="%2394a3b8"/>
      <polyline points="21 15 16 10 5 21" stroke="%2394a3b8"/>
    </svg>
  `);

  // Set placeholder favicon immediately on mount to prevent default favicon flash
  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = PLACEHOLDER_FAVICON;
    }
  }, []);

  // Fetch company logo and billing permission on mount (only if user is authenticated)
  useEffect(() => {
    const fetchCompanySettings = async () => {
      // Only fetch if user is logged in
      if (!userInfo?.userId) {
        return;
      }

      try {
        const company = await apiService.getCompanySettings();
        if (company?.logo_url) {
          setCompanyLogo(company.logo_url);
        }

        // Update favicon to company favicon, or company logo as fallback, or placeholder
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          if (company?.favicon_url) {
            link.href = company.favicon_url;
          } else if (company?.logo_url) {
            // Use company logo as fallback if no favicon
            link.href = company.logo_url;
          } else {
            // Keep the placeholder favicon (already set)
            link.href = PLACEHOLDER_FAVICON;
          }
        }

        // Update page title to company name
        if (company?.name) {
          document.title = `${company.name} - Admin Dashboard`;
        }

        setAdminCanAccessBilling(company?.admin_can_access_billing || false);
      } catch (error) {
        console.error('Failed to fetch company settings:', error);
        // Keep placeholder favicon on error (already set)
      }
    };
    fetchCompanySettings();
  }, [userInfo?.userId]);

  const handleLogout = () => {
    // Restore default favicon and title on logout
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/githaf_fav.png';
    }
    document.title = 'Githaforge - AI Chatbot Builder';
    logout();
    navigate('/login');
  };

  // Check if user can access billing
  const canAccessBilling = userRole === 'owner' || (userRole === 'admin' && adminCanAccessBilling);

  // Admin page title mappings
  const ADMIN_PAGE_TITLES: Record<string, string> = {
    '/admin': 'Analytics',
    '/admin/analytics': 'Analytics',
    '/admin/chatbots': 'Chatbots',
    '/admin/documents': 'Knowledge Base',
    '/admin/conversations': 'Conversations',
    '/admin/flagged': 'Flagged Queries',
    '/admin/learning': 'Learning',
    '/admin/team': 'Team Management',
    '/admin/billing': 'Billing & Plans',
    '/admin/integrations': 'Integrations',
    '/admin/settings': 'Settings',
    '/admin/deleted': 'Deleted Items',
    '/admin/users': 'Users',
  };

  // Update page title based on current route
  useEffect(() => {
    const pageName = ADMIN_PAGE_TITLES[location.pathname];
    if (pageName) {
      document.title = `${pageName} | ${companyName} - Admin`;
    } else if (location.pathname.startsWith('/admin/chatbots/')) {
      document.title = `Chatbot Details | ${companyName} - Admin`;
    } else {
      document.title = `${companyName} - Admin Dashboard`;
    }
  }, [location.pathname, companyName]);

  const navItems = [
    { path: '/admin', label: t('nav.analytics'), icon: BarChart3, color: 'text-blue-400' },
    { path: '/admin/chatbots', label: 'Chatbots', icon: Bot, color: 'text-cyan-400' },
    { path: '/admin/documents', label: t('nav.knowledgeBase'), icon: FileText, color: 'text-green-400' },
    { path: '/admin/conversations', label: t('nav.conversations'), icon: MessageSquare, color: 'text-violet-400' },
    { path: '/admin/flagged', label: t('nav.flaggedQueries'), icon: Flag, color: 'text-red-400' },
    { path: '/admin/learning', label: t('nav.learning'), icon: Brain, color: 'text-emerald-400' },
    { path: '/admin/team', label: 'Team Management', icon: Users, color: 'text-amber-400' },
    ...(canAccessBilling ? [{ path: '/admin/billing', label: 'Billing & Plans', icon: DollarSign, color: 'text-yellow-400' }] : []),
    { path: '/admin/integrations', label: 'Integrations', icon: Cloud, color: 'text-sky-400' },
    { path: '/admin/settings', label: 'Settings', icon: Settings, color: 'text-indigo-400' },
    { path: '/admin/deleted', label: t('nav.trash'), icon: Trash2, color: 'text-orange-400' },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Mobile Header */}
      <motion.div
        className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 z-40 shadow-xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="w-10 h-10 rounded-xl shadow-lg object-contain bg-slate-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl shadow-lg bg-slate-800 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-slate-400" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-slate-300">{companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-50">
            <LanguageSelector />
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X size={24} className="text-slate-200" />
              ) : (
                <Menu size={24} className="text-slate-200" />
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            <motion.aside
              className="lg:hidden fixed top-[60px] left-0 bottom-0 w-80 bg-slate-900 border-r border-slate-700 z-50 overflow-y-auto shadow-2xl"
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <nav className="p-6 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-white' : item.color} />
                      <span className="font-medium">{item.label}</span>
                      {isActive && <ChevronRight size={18} className="ml-auto" />}
                    </Link>
                  );
                })}

                <div className="pt-4 mt-4 border-t border-slate-700">
                  <Link
                    to="/"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
                  >
                    <Home size={20} className="text-slate-300" />
                    <span className="font-medium">{t('nav.backToHome')}</span>
                  </Link>

                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all mt-2"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">{t('nav.signOut')}</span>
                  </button>
                </div>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-72 bg-slate-900 border-r border-slate-700 shadow-2xl z-30">
        {/* Logo & Controls - Fixed at top */}
        <div className="flex-shrink-0 p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="w-12 h-12 rounded-2xl shadow-lg object-contain bg-slate-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl shadow-lg bg-slate-800 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-slate-300">{companyName}</p>
            </div>
          </div>

          {/* Language & Theme Controls */}
          <div className="flex items-center gap-2 relative z-50">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto px-6 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : item.color} />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight size={18} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - Fixed at bottom */}
        <div className="flex-shrink-0 p-6 pt-4 space-y-2 border-t border-slate-700">
          {/* User Avatar */}
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            {userInfo?.avatarUrl ? (
              <img
                src={userInfo.avatarUrl}
                alt={firstName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-semibold text-sm">{firstInitial}</span>
              </div>
            )}
            <span className="text-sm text-slate-300">{firstName}</span>
          </div>

          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Home size={20} className="text-slate-300" />
            <span className="font-medium">{t('nav.backToHome')}</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('nav.signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 h-screen pt-[60px] lg:pt-0 flex flex-col">
        <div className="p-6 lg:p-8 flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
