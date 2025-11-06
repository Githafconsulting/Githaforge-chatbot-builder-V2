import React from 'react';
import { motion } from 'framer-motion';
import { cardHoverVariants } from '../../utils/animations';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  glass?: boolean;
  variant?: 'elevated' | 'flat' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
  glass = false,
  variant = 'elevated',
}) => {
  const variantClasses = {
    elevated: 'bg-theme-primary shadow-md hover:shadow-lg',
    flat: 'bg-theme-secondary',
    outlined: 'bg-theme-primary border-2 border-theme',
  };

  const baseClassName = clsx(
    'rounded-xl p-6 transition-all',
    variantClasses[variant],
    glass && 'glass',
    hover && 'cursor-pointer',
    className
  );

  if (hover) {
    return (
      <motion.div
        className={baseClassName}
        initial="rest"
        whileHover="hover"
        variants={cardHoverVariants}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClassName} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={clsx('border-b border-theme pb-4 mb-4', className)}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h3 className={clsx('text-xl font-semibold text-theme-primary', className)}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <p className={clsx('text-sm text-theme-secondary mt-1', className)}>
    {children}
  </p>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={clsx('', className)}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={clsx('border-t border-theme pt-4 mt-4', className)}>
    {children}
  </div>
);
