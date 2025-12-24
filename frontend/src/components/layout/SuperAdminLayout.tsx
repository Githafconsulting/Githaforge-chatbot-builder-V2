import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Building2,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Users,
  DollarSign,
  Bot,
  Settings,
  Sparkles,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { useSuperAdminAuth } from '../../contexts/SuperAdminAuthContext';
import { slideInLeft } from '../../utils/animations';
import { ThemeToggle } from '../ThemeToggle';

export const SuperAdminLayout: React.FC = () => {
  const { logout } = useSuperAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/super-admin-login');
  };

  const navItems = [
    { path: '/super-admin', label: 'Platform Analytics', icon: BarChart3, color: 'text-blue-400' },
    { path: '/super-admin/companies', label: 'Companies', icon: Building2, color: 'text-purple-400' },
    { path: '/super-admin/system-personas', label: 'System Personas', icon: Sparkles, color: 'text-pink-400' },
    { path: '/super-admin/blogs', label: 'Blog Management', icon: BookOpen, color: 'text-orange-400' },
    { path: '/super-admin/faqs', label: 'FAQ Management', icon: HelpCircle, color: 'text-yellow-400' },
    { path: '/super-admin/platform-chatbot', label: 'Platform Chatbot', icon: Bot, color: 'text-emerald-400' },
    { path: '/super-admin/chatbot-config', label: 'Chatbot Config', icon: Settings, color: 'text-cyan-400' },
    { path: '/super-admin/users', label: 'All Users', icon: Users, color: 'text-green-400' },
    { path: '/super-admin/billing', label: 'Billing & Plans', icon: DollarSign, color: 'text-amber-400' },
    { path: '/super-admin/logs', label: 'System Logs', icon: FileText, color: 'text-slate-400' },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Mobile Header */}
      <motion.div
        className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-b border-red-700 z-40 shadow-xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin</h1>
              <p className="text-xs text-red-300">Platform Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-50">
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
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={closeMobileMenu}
            />
            <motion.div
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="lg:hidden fixed top-16 left-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md border-r border-red-700 z-40 overflow-y-auto"
            >
              <nav className="p-4 space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-red-400' : item.color}`} />
                      <span className="font-medium">{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 ml-auto text-red-400" />}
                    </Link>
                  );
                })}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all mt-4 border-t border-slate-700 pt-6"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 bg-slate-900/50 backdrop-blur-md border-r border-red-700 overflow-y-auto z-30"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-red-700/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Super Admin</h1>
              <p className="text-xs text-red-300">Platform Control</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-red-400' : item.color}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto text-red-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-red-700/50 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Theme</span>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>

          <div className="mt-3 text-center">
            <p className="text-xs text-slate-600">v1.0.0 • Super Admin</p>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
};
