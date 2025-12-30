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
    { label: 'FAQs', path: '/faqs' },
    { label: 'Blog', path: '/blogs' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Determine if navbar should be expanded (at top or hovered)
  const isExpanded = !scrolled || isHovered || isMenuOpen;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 transition-all duration-300"
    >
      {/* Container wrapper to maintain consistent left alignment */}
      <div className="container mx-auto">
        <motion.nav
          className={`bg-slate-400/30 dark:bg-slate-400/30 backdrop-blur-md shadow-xl border border-slate-300/50 transition-all duration-500 ease-in-out h-24 ${
            isExpanded ? 'w-full rounded-[48px]' : 'w-24 rounded-full flex items-center justify-center'
          }`}
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`h-full transition-all duration-500 ease-in-out ${isExpanded ? 'px-6 sm:px-8 lg:px-12' : 'w-full flex items-center justify-center'}`}>
            <div className={`h-full flex items-center transition-all duration-500 ease-in-out ${!isExpanded ? 'justify-center' : ''}`}>
              {/* Logo - Always visible */}
              <Link
                to="/"
                className={`flex items-center group relative z-10 transition-all duration-500 ${isExpanded ? 'gap-3' : 'gap-0 justify-center'}`}
              >
                <motion.img
                  src="/images/branding/githaf_logo.png"
                  alt="Githaforge Logo"
                  className={`transition-all duration-500 ${isExpanded ? 'h-14' : 'h-12'} w-auto`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                />
                <motion.div
                  initial={false}
                  animate={{
                    width: isExpanded ? 'auto' : 0,
                    opacity: isExpanded ? 1 : 0,
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="text-2xl font-display font-bold text-white">
                    Githaforge
                  </span>
                  <p className="text-sm text-white/80 -mt-0.5">AI Chatbot Builder</p>
                </motion.div>
              </Link>

              {/* Spacer to push menu items to center when expanded */}
              <div className={`flex-1 transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`} />

              {/* Desktop Menu - Only show when expanded */}
              <motion.div
                className="hidden lg:flex items-center gap-1"
                initial={false}
                animate={{
                  width: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    className="relative px-4 py-2 group"
                  >
                    <span
                      className={`relative z-10 transition-colors whitespace-nowrap ${
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
              </motion.div>

              {/* Spacer to push right side content */}
              <div className={`flex-1 transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`} />

              {/* Right Side - Only show when expanded */}
              <motion.div
                className="flex items-center gap-2"
                initial={false}
                animate={{
                  width: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
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
                    className="font-medium text-white/80 hover:text-white whitespace-nowrap"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate('/signup')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/40 font-medium rounded-3xl whitespace-nowrap"
                  >
                    Get Started Free
                  </Button>
                </div>

                {/* Mobile Menu Button - Always visible on mobile when expanded */}
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
              </motion.div>
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
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/40"
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
    </div>
  );
};
