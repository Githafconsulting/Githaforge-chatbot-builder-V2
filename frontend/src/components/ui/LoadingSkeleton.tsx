import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  variant?: 'text' | 'circle' | 'rect' | 'card';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  count = 1,
  variant = 'rect',
}) => {
  const baseClass = 'skeleton bg-neutral-200 animate-pulse';

  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'h-24 rounded-lg',
    card: 'h-48 rounded-xl',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className={`${baseClass} ${variantClasses[variant]} ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  );
};

// Specific skeleton components
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <LoadingSkeleton
        key={i}
        variant="text"
        className={i === lines - 1 ? 'w-2/3' : 'w-full'}
      />
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-6 bg-white rounded-xl shadow-soft ${className}`}>
    <LoadingSkeleton variant="circle" className="w-12 h-12 mb-4" />
    <LoadingSkeleton variant="text" className="w-3/4 mb-2" />
    <LoadingSkeleton variant="text" className="w-1/2" />
  </div>
);
