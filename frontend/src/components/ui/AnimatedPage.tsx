import React from 'react';
import { motion } from 'framer-motion';
import { pageTransition } from '../../utils/animations';

interface AnimatedPageProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransition}
    >
      {children}
    </motion.div>
  );
};
