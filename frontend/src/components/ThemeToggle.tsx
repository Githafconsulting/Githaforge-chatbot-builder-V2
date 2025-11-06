import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Check if theme switching is allowed
  const systemSettings = localStorage.getItem('systemSettings');
  let allowThemeSwitching = true;

  if (systemSettings) {
    try {
      const settings = JSON.parse(systemSettings);
      allowThemeSwitching = settings.allowThemeSwitching ?? true;
    } catch (e) {
      // ignore
    }
  }

  if (!allowThemeSwitching) {
    return null;
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-all duration-300"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(243, 244, 246, 0.8)',
        color: theme === 'dark' ? '#f1f5f9' : '#1e1e1e',
      }}
      whileHover={{
        scale: 1.05,
        backgroundColor: theme === 'dark' ? 'rgba(71, 85, 105, 0.8)' : 'rgba(229, 231, 235, 1)',
      }}
      whileTap={{ scale: 0.95 }}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <motion.div
        initial={{ rotate: 0, scale: 1 }}
        animate={{ rotate: theme === 'light' ? 0 : 180, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {theme === 'light' ? (
          <Moon size={20} />
        ) : (
          <Sun size={20} />
        )}
      </motion.div>
    </motion.button>
  );
};
