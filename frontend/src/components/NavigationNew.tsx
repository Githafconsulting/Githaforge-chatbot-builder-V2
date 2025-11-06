import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Menu, X } from 'lucide-react';
import { Button } from './ui';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';

export const NavigationNew: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Reset hover state when menu closes on mobile
  useEffect(() => {
    if (!isMenuOpen) {
      setIsHovered(false);
    }
  }, [isMenuOpen]);

  // Track scroll position for header visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'FAQs', path: '#' },
    { label: 'Blogs', path: '#' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 transition-opacity duration-300"
      style={{ opacity: scrolled && !isMenuOpen && !isHovered ? 0.3 : 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.nav
        className="container mx-auto bg-slate-400/30 dark:bg-slate-400/30 backdrop-blur-md rounded-[48px] shadow-xl border border-slate-300/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-24">
          {/* Logo - Enhanced */}
          <Link to="/" className="flex items-center gap-3 group relative z-10">
            <motion.img
              src="/githaf_logo.png"
              alt="Githaforge Logo"
              className="h-14 w-auto"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            />
            <div>
              <span className="text-2xl font-display font-bold text-white">
                Githaforge
              </span>
              <p className="text-sm text-white/80 -mt-0.5">AI Chatbot Builder</p>
            </div>
          </Link>

          {/* Desktop Menu - Modern Design */}
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className="relative px-4 py-2 group"
              >
                <span
                  className={`relative z-10 transition-colors ${
                    isActive(item.path)
                      ? 'text-white font-bold'
                      : 'text-white/70 font-medium hover:text-white'
                  }`}
                >
                  {item.label}
                </span>
                {isActive(item.path) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white/20 rounded-xl shadow-lg"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right Side - Enhanced */}
          <div className="flex items-center gap-2">
            {/* Mobile: Only show hamburger menu */}
            {/* Desktop: Show theme, language, and auth buttons */}

            {/* Theme & Language - Desktop only */}
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSelector />
              <ThemeToggle />
            </div>

            {/* Auth Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => navigate('/login')}
                className="font-medium text-white/80 hover:text-white"
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/signup')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg font-medium rounded-3xl"
              >
                Get Started Free
              </Button>
            </div>

            {/* Mobile Menu Button - Always visible on mobile */}
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors border border-white/30"
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-7 h-7 text-white stroke-[2.5]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-7 h-7 text-white stroke-[2.5]" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
          </div>
        </div>

        {/* Mobile Menu - Dropdown below header */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setIsMenuOpen(false)}
                style={{ top: '120px' }} // Start below the header
              />

              {/* Menu content */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden bg-slate-400/30 backdrop-blur-md rounded-b-[48px] border-t border-slate-300/50 relative z-50"
                style={{ maxHeight: 'calc(100vh - 140px)' }}
              >
              <div className="px-6 py-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
                {/* Mobile Menu Items */}
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-lg font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-white/20 text-white font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* Mobile Theme & Language Controls */}
                <div className="pt-4 pb-2 flex items-center justify-center gap-4 border-t border-white/10">
                  <div className="flex items-center gap-2 pt-4">
                    <LanguageSelector />
                    <ThemeToggle />
                  </div>
                </div>

                {/* Mobile Auth Buttons */}
                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => {
                      navigate('/login');
                      setIsMenuOpen(false);
                    }}
                    className="text-white border-white/30 hover:bg-white/10"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() => {
                      navigate('/signup');
                      setIsMenuOpen(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Get Started Free
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
};

